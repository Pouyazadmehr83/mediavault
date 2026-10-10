# pyrefly: ignore [missing-import]
from rest_framework import serializers

from .models import MediaFile, Album
from .validators import validate_file


class MediaFileSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        validators=[validate_file]
    )

    class Meta:
        model = MediaFile
        fields = [
            "id",
            "owner",
            "file",
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


class AlbumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Album
        fields = [
            "id",
            "owner",
            "title",
            "description",
            "is_public",
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