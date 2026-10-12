import uuid
import os
from django.db import models
from users.models import User
import secrets
from django.utils import timezone
from datetime import timedelta



def default_expiration():
    return timezone.now() + timedelta(days=1)

def generate_token():
    return secrets.token_urlsafe(32)


def media_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    return f"users/{instance.owner_id}/{uuid.uuid4().hex}{ext}"


class Album(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="albums")
    title = models.CharField(max_length=255, null=False, blank=False)
    description = models.TextField(null=True, blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class MediaFile(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(upload_to=media_upload_path)
    thumbnail = models.FileField(upload_to=media_upload_path, null=True, blank=True)
    album = models.ForeignKey(Album, on_delete=models.SET_NULL, null=True, blank=True, related_name="media_files")
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name

    def delete(self, *args, **kwargs):
        self.file.delete(save=False)
        super().delete(*args, **kwargs)

class ShareLink(models.Model):
    media_file = models.ForeignKey(MediaFile, on_delete=models.CASCADE, related_name="share_links")
    token = models.CharField(max_length=64, unique=True, default=generate_token)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_expiration)
    views_count = models.IntegerField(default=0)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"ShareLink for {self.media_file.original_name}"
