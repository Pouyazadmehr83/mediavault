from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import MediaFile, Album
from django.shortcuts import get_object_or_404
from .serializers import MediaFileSerializer, AlbumSerializer
from .services import generate_presigned_url
from django.conf import settings


class MediaListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaFileSerializer
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        return MediaFile.objects.filter(owner=self.request.user)    


class MediaDetailView(RetrieveDestroyAPIView):
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
        url = generate_presigned_url(media_file)
        return Response({
            "download_url": url,
            "expires_in": settings.PRESIGNED_URL_EXPIRE_SECONDS,
})

class AlbumListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumSerializer

    def get_queryset(self):
        return Album.objects.filter(owner=self.request.user)

class AlbumDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AlbumSerializer

    def get_queryset(self):
        return Album.objects.filter(owner=self.request.user)