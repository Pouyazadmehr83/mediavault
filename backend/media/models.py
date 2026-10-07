from django.db import models
from users.models import User
# Create your models here.

class MediaFile(models.Model):
    owner=models.ForeignKey(User, on_delete=models.CASCADE, related_name="media_files")
    file=models.FileField(upload_to="media_files")
    original_name=models.CharField(max_length=255)
    content_type=models.CharField(max_length=100)
    size=models.PositiveIntegerField()
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.orginal_name
    