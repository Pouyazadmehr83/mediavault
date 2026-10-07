import uuid
import os

from django.db import models
from users.models import User


def media_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"users/{instance.owner_id}/{uuid.uuid4().hex}{ext}"


class MediaFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(upload_to=media_upload_path)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name

    def delete(self, *args, **kwargs):
        # Delete the file from MinIO before removing the DB record
        self.file.delete(save=False)
        super().delete(*args, **kwargs)