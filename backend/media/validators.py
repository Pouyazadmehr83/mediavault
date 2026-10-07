import os
from django.conf import settings
from django.core.exceptions import ValidationError


def validate_file(file):
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise ValidationError("Invalid file format.")
    if file.size > settings.MAX_UPLOAD_SIZE:
        raise ValidationError("File size is too large.")
    