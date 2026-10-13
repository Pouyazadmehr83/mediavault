from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import F, Count
from .models import MediaFile, Album, ShareLink
from django.shortcuts import get_object_or_404
from .serializers import MediaFileSerializer, AlbumSerializer, ShareLinkSerializer
from .services import generate_presigned_url
from django.conf import settings
from .tasks import generate_thumbnail
from .pagination import StandardResultsSetPagination
from .filters import MediaFileFilter, AlbumFilter

class MediaListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaFileSerializer
    parser_classes = [MultiPartParser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = MediaFileFilter
    search_fields = ["original_name"]
    ordering_fields = ["created_at", "size", "original_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return MediaFile.objects.filter(owner=self.request.user)    

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.content_type.startswith("image/"):
            generate_thumbnail.delay(instance.id)   

class MediaDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaFileSerializer

    def get_queryset(self):
        return MediaFile.objects.filter(owner=self.request.user)


class MediaFileURLView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        media_file = get_object_or_404(
            MediaFile,
            id=pk,
            owner=request.user,
        )
        as_attachment = request.query_params.get("download") in ("1", "true")
        url = generate_presigned_url(media_file, as_attachment=as_attachment)
        return Response({
            "download_url": url,
            "expires_in": settings.PRESIGNED_URL_EXPIRE_SECONDS,
})

class AlbumListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = AlbumFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Album.objects.filter(owner=self.request.user).annotate(media_count=Count("media_files"))

class AlbumDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumSerializer

    def get_queryset(self):
        return Album.objects.filter(owner=self.request.user).annotate(media_count=Count("media_files"))


class ShareLinkListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ShareLinkSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [OrderingFilter]
    ordering_fields = ["created_at", "expires_at", "views_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ShareLink.objects.filter(media_file__owner=self.request.user)


class ShareLinkDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ShareLinkSerializer

    def get_queryset(self):
        return ShareLink.objects.filter(media_file__owner=self.request.user)


class PublicShareLinkView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        share_link = get_object_or_404(ShareLink, token=token)

        if share_link.is_expired():
            return Response(
                {"detail": "This share link has expired."},
                status=status.HTTP_410_GONE,
            )

        ShareLink.objects.filter(id=share_link.id).update(views_count=F("views_count") + 1)
        share_link.refresh_from_db(fields=["views_count"])

        download_url = generate_presigned_url(share_link.media_file)
        return Response({
            "download_url": download_url,
            "original_name": share_link.media_file.original_name,
            "content_type": share_link.media_file.content_type,
            "size": share_link.media_file.size,
            "expires_at": share_link.expires_at,
            "views_count": share_link.views_count,
        })