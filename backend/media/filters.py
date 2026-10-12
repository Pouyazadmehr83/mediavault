import django_filters
from .models import MediaFile, Album


class MediaFileFilter(django_filters.FilterSet):
    content_type = django_filters.CharFilter(field_name="content_type", lookup_expr="icontains")
    album = django_filters.NumberFilter(field_name="album_id")
    no_album = django_filters.BooleanFilter(field_name="album", lookup_expr="isnull")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    min_size = django_filters.NumberFilter(field_name="size", lookup_expr="gte")
    max_size = django_filters.NumberFilter(field_name="size", lookup_expr="lte")

    class Meta:
        model = MediaFile
        fields = [
            "content_type",
            "album",
            "no_album",
            "created_after",
            "created_before",
            "min_size",
            "max_size",
        ]


class AlbumFilter(django_filters.FilterSet):
    is_public = django_filters.BooleanFilter(field_name="is_public")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Album
        fields = [
            "is_public",
            "created_after",
            "created_before",
        ]
