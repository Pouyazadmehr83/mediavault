# pyrefly: ignore [missing-import]
from rest_framework import serializers

from .models import MediaFile, Album, ShareLink
from .validators import validate_file
from .services import generate_presigned_url


class MediaFileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        validators=[validate_file]
    )
    url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaFile
        fields = [
            "id",
            "owner",
            "file",
            "url",
            "thumbnail_url",
            "album",
            "original_name",
            "content_type",
            "size",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "original_name",
            "content_type",
            "size",
            "created_at",
        ]

    def create(self, validated_data):
        file = validated_data["file"]

        validated_data["owner"] = self.context["request"].user
        validated_data["original_name"] = file.name
        validated_data["content_type"] = file.content_type
        validated_data["size"] = file.size

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # The stored object is immutable; only metadata such as the album can change.
        validated_data.pop("file", None)
        return super().update(instance, validated_data)

    def validate_album(self, value):
        if value is not None and value.owner != self.context["request"].user:
            raise serializers.ValidationError("Album not found.")
        return value

    def get_url(self, obj):
        return generate_presigned_url(obj)

    def get_thumbnail_url(self, obj):
        return generate_presigned_url(obj, field="thumbnail")


class AlbumSerializer(serializers.ModelSerializer):
    media_count = serializers.IntegerField(read_only=True, default=0)
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "is_public",
            "media_count",
            "cover_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

    def get_cover_url(self, obj):
        cover = obj.media_files.order_by("-created_at").first()
        if cover is None:
            return None
        field = "thumbnail" if cover.thumbnail else "file"
        return generate_presigned_url(cover, field=field)


class ShareLinkSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ShareLink
        fields = [
            "id",
            "media_file",
            "token",
            "created_at",
            "expires_at",
            "views_count",
            "is_expired",
        ]
        read_only_fields = [
            "id",
            "token",
            "created_at",
            "views_count",
            "is_expired",
        ]
        extra_kwargs = {
            "expires_at": {"required": False},
        }

    def validate_media_file(self, value):
        user = self.context["request"].user
        if value.owner != user:
            raise serializers.ValidationError("You do not have permission to share this file.")
        return value