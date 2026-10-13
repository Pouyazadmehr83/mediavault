from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from django.utils import timezone
from django.test import override_settings

from .models import MediaFile, Album, ShareLink

User = get_user_model()

from io import BytesIO
from PIL import Image

def generate_test_image(name="test.png"):
    img = Image.new('RGB', (100, 100), color='red')
    img_io = BytesIO()
    img.save(img_io, format='PNG')
    return SimpleUploadedFile(name, img_io.getvalue(), content_type="image/png")


class MediaAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email="user1@example.com",
            password="Password123!",
            first_name="User",
            last_name="One",
        )
        self.user2 = User.objects.create_user(
            email="user2@example.com",
            password="Password123!",
            first_name="User",
            last_name="Two",
        )
        self.list_create_url = reverse("media-list-create")

    def test_unauthenticated_access_denied(self):
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        image = generate_test_image()
        response = self.client.post(self.list_create_url, {"file": image}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_valid_file(self):
        self.client.force_authenticate(user=self.user1)
        image = generate_test_image("avatar.png")

        response = self.client.post(self.list_create_url, {"file": image}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["original_name"], "avatar.png")
        self.assertEqual(response.data["owner"], self.user1.id)

        media_file = MediaFile.objects.get(id=response.data["id"])
        self.assertEqual(media_file.owner, self.user1)
        self.assertTrue(media_file.file.name.startswith(f"users/{self.user1.id}/"))

    def test_upload_invalid_extension(self):
        self.client.force_authenticate(user=self.user1)
        fake_file = SimpleUploadedFile("script.sh", b"echo hello", content_type="text/plain")

        response = self.client.post(self.list_create_url, {"file": fake_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("file", response.data)

    def test_upload_oversized_file(self):
        self.client.force_authenticate(user=self.user1)
        # Create dummy file > 10MB
        large_content = b"x" * (10 * 1024 * 1024 + 1)
        large_file = SimpleUploadedFile("huge.jpg", large_content, content_type="image/jpeg")

        response = self.client.post(self.list_create_url, {"file": large_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_files_user_isolation(self):
        self.client.force_authenticate(user=self.user1)
        img1 = generate_test_image("user1.png")
        self.client.post(self.list_create_url, {"file": img1}, format="multipart")

        self.client.force_authenticate(user=self.user2)
        img2 = generate_test_image("user2.png")
        self.client.post(self.list_create_url, {"file": img2}, format="multipart")

        # User 2 list
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["original_name"], "user2.png")

    def test_detail_and_delete_file(self):
        self.client.force_authenticate(user=self.user1)
        img = generate_test_image("test_del.png")
        res = self.client.post(self.list_create_url, {"file": img}, format="multipart")
        file_id = res.data["id"]

        detail_url = reverse("media-detail", kwargs={"pk": file_id})

        # User 2 cannot access user 1's file
        self.client.force_authenticate(user=self.user2)
        res_other = self.client.get(detail_url)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

        res_other_del = self.client.delete(detail_url)
        self.assertEqual(res_other_del.status_code, status.HTTP_404_NOT_FOUND)

        # User 1 can access and delete
        self.client.force_authenticate(user=self.user1)
        res_detail = self.client.get(detail_url)
        self.assertEqual(res_detail.status_code, status.HTTP_200_OK)

        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MediaFile.objects.filter(id=file_id).exists())

    def test_presigned_url_generation(self):
        self.client.force_authenticate(user=self.user1)
        img = generate_test_image("test_url.png")
        res = self.client.post(self.list_create_url, {"file": img}, format="multipart")
        file_id = res.data["id"]

        url_endpoint = reverse("media-file-url", kwargs={"pk": file_id})

        # User 2 shouldn't be able to get URL for User 1's file
        self.client.force_authenticate(user=self.user2)
        res_other = self.client.get(url_endpoint)
        self.assertEqual(res_other.status_code, status.HTTP_404_NOT_FOUND)

        # User 1 should get URL
        self.client.force_authenticate(user=self.user1)
        res_url = self.client.get(url_endpoint)
        self.assertEqual(res_url.status_code, status.HTTP_200_OK)
        self.assertIn("download_url", res_url.data)
        self.assertIn("expires_in", res_url.data)
        self.assertTrue(res_url.data["download_url"].startswith("http"))

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_celery_thumbnail_generation(self):
        self.client.force_authenticate(user=self.user1)
        
        img = generate_test_image("big_photo.png")
        response = self.client.post(self.list_create_url, {"file": img}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        file_id = response.data["id"]
        
        media_file = MediaFile.objects.get(id=file_id)
        
        self.assertTrue(bool(media_file.thumbnail))
        self.assertTrue(media_file.thumbnail.name.startswith("users/"))


class AlbumAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email="user1_album@example.com",
            password="Password123!",
            first_name="User",
            last_name="One",
        )
        self.user2 = User.objects.create_user(
            email="user2_album@example.com",
            password="Password123!",
            first_name="User",
            last_name="Two",
        )
        self.album_list_url = reverse("album-list-create")

    def test_create_album(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            "title": "My Vacation",
            "description": "Photos from 2024",
            "is_public": False
        }
        res = self.client.post(self.album_list_url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "My Vacation")
        self.assertEqual(res.data["owner"], self.user1.id)

    def test_list_albums_isolated(self):
        Album.objects.create(owner=self.user1, title="User 1 Album")
        Album.objects.create(owner=self.user2, title="User 2 Album")

        self.client.force_authenticate(user=self.user1)
        res = self.client.get(self.album_list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Depending on pagination, results might be in res.data["results"] or res.data
        results = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "User 1 Album")

    def test_upload_file_to_album(self):
        self.client.force_authenticate(user=self.user1)
        album = Album.objects.create(owner=self.user1, title="User 1 Album")
        
        img = generate_test_image("album_pic.png")
        upload_url = reverse("media-list-create")
        
        res = self.client.post(upload_url, {"file": img, "album": album.id}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["album"], album.id)
        
        media_file = MediaFile.objects.get(id=res.data["id"])
        self.assertEqual(media_file.album, album)


class ShareLinkAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            email="user1_share@example.com",
            password="Password123!",
            first_name="User",
            last_name="One",
        )
        self.user2 = User.objects.create_user(
            email="user2_share@example.com",
            password="Password123!",
            first_name="User",
            last_name="Two",
        )
        self.client.force_authenticate(user=self.user1)
        image = generate_test_image("share_file.png")
        res = self.client.post(reverse("media-list-create"), {"file": image}, format="multipart")
        self.media_file1 = MediaFile.objects.get(id=res.data["id"])

        self.client.force_authenticate(user=self.user2)
        image2 = generate_test_image("user2_file.png")
        res2 = self.client.post(reverse("media-list-create"), {"file": image2}, format="multipart")
        self.media_file2 = MediaFile.objects.get(id=res2.data["id"])

        self.client.logout()
        self.share_list_create_url = reverse("share-link-list-create")

    def test_create_share_link(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.share_list_create_url, {"media_file": self.media_file1.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["media_file"], self.media_file1.id)
        self.assertIn("token", response.data)
        self.assertFalse(response.data["is_expired"])
        self.assertEqual(response.data["views_count"], 0)

    def test_cannot_create_share_link_for_other_user_file(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.share_list_create_url, {"media_file": self.media_file2.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_and_delete_share_links(self):
        link1 = ShareLink.objects.create(media_file=self.media_file1)
        link2 = ShareLink.objects.create(media_file=self.media_file2)

        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.share_list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], link1.id)

        # User 1 can delete their own link
        detail_url = reverse("share-link-detail", kwargs={"pk": link1.id})
        del_res = self.client.delete(detail_url)
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ShareLink.objects.filter(id=link1.id).exists())

        # User 1 cannot delete User 2's link
        user2_link_url = reverse("share-link-detail", kwargs={"pk": link2.id})
        del_other = self.client.delete(user2_link_url)
        self.assertEqual(del_other.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_access_valid_token(self):
        link = ShareLink.objects.create(media_file=self.media_file1)
        public_url = reverse("public-share-link", kwargs={"token": link.token})

        # No authentication
        response = self.client.get(public_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("download_url", response.data)
        self.assertTrue(response.data["download_url"].startswith("http"))
        self.assertEqual(response.data["original_name"], self.media_file1.original_name)
        self.assertEqual(response.data["views_count"], 1)

        # Second access increments views count
        response2 = self.client.get(public_url)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data["views_count"], 2)

    def test_public_access_expired_token(self):
        past_time = timezone.now() - timedelta(hours=1)
        link = ShareLink.objects.create(media_file=self.media_file1, expires_at=past_time)
        public_url = reverse("public-share-link", kwargs={"token": link.token})

        response = self.client.get(public_url)
        self.assertEqual(response.status_code, status.HTTP_410_GONE)

    def test_public_access_invalid_token(self):
        public_url = reverse("public-share-link", kwargs={"token": "invalidtoken123"})
        response = self.client.get(public_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PaginationFilteringSearchAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="filteruser@example.com",
            password="Password123!",
            first_name="Filter",
            last_name="User",
        )
        self.client.force_authenticate(user=self.user)
        self.album1 = Album.objects.create(
            owner=self.user,
            title="Vacation Photos",
            description="Trip to north",
            is_public=True,
        )
        self.album2 = Album.objects.create(
            owner=self.user,
            title="Work Invoices",
            description="Financial records",
            is_public=False,
        )

        self.file1 = MediaFile.objects.create(
            owner=self.user,
            file=SimpleUploadedFile("vacation1.png", b"test content 1", content_type="image/png"),
            original_name="vacation1.png",
            content_type="image/png",
            size=100,
            album=self.album1,
        )
        self.file2 = MediaFile.objects.create(
            owner=self.user,
            file=SimpleUploadedFile("report_invoice.pdf", b"test content 2", content_type="application/pdf"),
            original_name="report_invoice.pdf",
            content_type="application/pdf",
            size=500,
            album=self.album2,
        )
        self.file3 = MediaFile.objects.create(
            owner=self.user,
            file=SimpleUploadedFile("unorganized.jpg", b"test content 3", content_type="image/jpeg"),
            original_name="unorganized.jpg",
            content_type="image/jpeg",
            size=1000,
            album=None,
        )
        self.files_url = reverse("media-list-create")
        self.albums_url = reverse("album-list-create")

    def test_pagination_structure(self):
        res = self.client.get(self.files_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("count", res.data)
        self.assertIn("next", res.data)
        self.assertIn("previous", res.data)
        self.assertIn("results", res.data)
        self.assertEqual(res.data["count"], 3)

    def test_pagination_custom_page_size(self):
        res = self.client.get(f"{self.files_url}?page_size=2")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 2)
        self.assertIsNotNone(res.data["next"])

        res_p2 = self.client.get(f"{self.files_url}?page=2&page_size=2")
        self.assertEqual(res_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_p2.data["results"]), 1)

    def test_search_files(self):
        res = self.client.get(f"{self.files_url}?search=invoice")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["original_name"], "report_invoice.pdf")

        res2 = self.client.get(f"{self.files_url}?search=vacation")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res2.data["results"]), 1)
        self.assertEqual(res2.data["results"][0]["original_name"], "vacation1.png")

    def test_filter_by_content_type(self):
        res = self.client.get(f"{self.files_url}?content_type=image")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 2)

        res_pdf = self.client.get(f"{self.files_url}?content_type=application/pdf")
        self.assertEqual(res_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_pdf.data["results"]), 1)
        self.assertEqual(res_pdf.data["results"][0]["original_name"], "report_invoice.pdf")

    def test_filter_by_album_and_no_album(self):
        res_album = self.client.get(f"{self.files_url}?album={self.album1.id}")
        self.assertEqual(res_album.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_album.data["results"]), 1)
        self.assertEqual(res_album.data["results"][0]["original_name"], "vacation1.png")

        res_no_album = self.client.get(f"{self.files_url}?no_album=true")
        self.assertEqual(res_no_album.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_no_album.data["results"]), 1)
        self.assertEqual(res_no_album.data["results"][0]["original_name"], "unorganized.jpg")

    def test_filter_by_size(self):
        res = self.client.get(f"{self.files_url}?min_size=200&max_size=800")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["results"]), 1)
        self.assertEqual(res.data["results"][0]["original_name"], "report_invoice.pdf")

    def test_ordering(self):
        res_asc = self.client.get(f"{self.files_url}?ordering=size")
        self.assertEqual(res_asc.status_code, status.HTTP_200_OK)
        sizes = [f["size"] for f in res_asc.data["results"]]
        self.assertEqual(sizes, [100, 500, 1000])

        res_desc = self.client.get(f"{self.files_url}?ordering=-size")
        self.assertEqual(res_desc.status_code, status.HTTP_200_OK)
        sizes_desc = [f["size"] for f in res_desc.data["results"]]
        self.assertEqual(sizes_desc, [1000, 500, 100])

    def test_album_search_filter_ordering(self):
        res_search = self.client.get(f"{self.albums_url}?search=Invoices")
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_search.data["results"]), 1)
        self.assertEqual(res_search.data["results"][0]["title"], "Work Invoices")

        res_public = self.client.get(f"{self.albums_url}?is_public=true")
        self.assertEqual(res_public.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_public.data["results"]), 1)
        self.assertEqual(res_public.data["results"][0]["title"], "Vacation Photos")

        res_ord = self.client.get(f"{self.albums_url}?ordering=title")
        self.assertEqual(res_ord.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in res_ord.data["results"]]
        self.assertEqual(titles, ["Vacation Photos", "Work Invoices"])


class FrontendSupportAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email="fe1@example.com", password="Password123!", first_name="F", last_name="E")
        self.user2 = User.objects.create_user(email="fe2@example.com", password="Password123!", first_name="F", last_name="E")
        self.album1 = Album.objects.create(owner=self.user1, title="Mine")
        self.album2 = Album.objects.create(owner=self.user2, title="Theirs")
        self.client.force_authenticate(user=self.user1)

    def _upload(self, **extra):
        res = self.client.post(
            reverse("media-list-create"),
            {"file": generate_test_image(), **extra},
            format="multipart",
        )
        return res

    def test_upload_returns_browser_urls(self):
        res = self._upload()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["url"].startswith("http"))
        self.assertIn("thumbnail_url", res.data)

    def test_cannot_upload_into_other_users_album(self):
        res = self._upload(album=self.album2.id)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_move_file_between_albums(self):
        file_id = self._upload().data["id"]
        url = reverse("media-detail", kwargs={"pk": file_id})

        res = self.client.patch(url, {"album": self.album1.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["album"], self.album1.id)

        res = self.client.patch(url, {"album": self.album2.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.patch(url, {"album": None}, format="json")
        self.assertIsNone(res.data["album"])

    def test_album_count_cover_and_update(self):
        self._upload(album=self.album1.id)
        res = self.client.get(reverse("album-detail", kwargs={"pk": self.album1.id}))
        self.assertEqual(res.data["media_count"], 1)
        self.assertTrue(res.data["cover_url"].startswith("http"))

        res = self.client.patch(
            reverse("album-detail", kwargs={"pk": self.album1.id}),
            {"title": "Renamed"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Renamed")

    def test_download_url_as_attachment(self):
        file_id = self._upload().data["id"]
        res = self.client.get(reverse("media-file-url", kwargs={"pk": file_id}) + "?download=1")
        self.assertIn("response-content-disposition", res.data["download_url"])
