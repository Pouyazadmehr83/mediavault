from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from .models import MediaFile
from .serializers import MediaFileSerializer


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