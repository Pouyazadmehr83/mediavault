from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import MediaFile

User = get_user_model()

# Minimal valid 1x1 PNG bytes
TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?"
    b"\x00\x05\xfe\x02\xfe\r\xefe\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def generate_test_image(name="test.png"):
    return SimpleUploadedFile(name, TINY_PNG, content_type="image/png")


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
