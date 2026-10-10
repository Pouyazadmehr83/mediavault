from django.urls import path
from .views import MediaListCreateView, MediaDetailView, MediaFileURLView, AlbumListCreateView, AlbumDetailView

urlpatterns = [
    path("files/", MediaListCreateView.as_view(), name="media-list-create"),
    path("files/<int:pk>/", MediaDetailView.as_view(), name="media-detail"),
    path("files/<int:pk>/download/", MediaFileURLView.as_view(), name="media-file-url"),
    path("albums/", AlbumListCreateView.as_view(), name="album-list-create"),
    path("albums/<int:pk>/", AlbumDetailView.as_view(), name="album-detail"),
]