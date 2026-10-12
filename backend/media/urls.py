from django.urls import path
from .views import (
    MediaListCreateView,
    MediaDetailView,
    MediaFileURLView,
    AlbumListCreateView,
    AlbumDetailView,
    ShareLinkListCreateView,
    ShareLinkDetailView,
    PublicShareLinkView,
)

urlpatterns = [
    path("files/", MediaListCreateView.as_view(), name="media-list-create"),
    path("files/<int:pk>/", MediaDetailView.as_view(), name="media-detail"),
    path("files/<int:pk>/download/", MediaFileURLView.as_view(), name="media-file-url"),
    path("albums/", AlbumListCreateView.as_view(), name="album-list-create"),
    path("albums/<int:pk>/", AlbumDetailView.as_view(), name="album-detail"),
    path("share-links/", ShareLinkListCreateView.as_view(), name="share-link-list-create"),
    path("share-links/<int:pk>/", ShareLinkDetailView.as_view(), name="share-link-detail"),
    path("share/<str:token>/", PublicShareLinkView.as_view(), name="public-share-link"),
]