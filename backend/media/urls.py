from django.urls import path
from .views import MediaListCreateView, MediaDetailView

urlpatterns = [
    path("files/", MediaListCreateView.as_view(), name="media-list-create"),
    path("files/<int:pk>/", MediaDetailView.as_view(), name="media-detail"),
]