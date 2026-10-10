import os
from io import BytesIO
from PIL import Image
from celery import shared_task
from django.core.files.base import ContentFile
from .models import MediaFile

@shared_task
def generate_thumbnail(media_file_id):
    try:
        media_file = MediaFile.objects.get(id=media_file_id)
        
        if not media_file.content_type.startswith("image/"):
            return "Not an image"

        content = media_file.file.read()
        img = Image.open(BytesIO(content))
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        img.thumbnail((200, 200))
            
        thumb_io = BytesIO()
        img.save(thumb_io, format="JPEG", quality=85)
            
        thumb_filename = f"thumb_{media_file.original_name}.jpg"
        media_file.thumbnail.save(thumb_filename, ContentFile(thumb_io.getvalue()), save=True)

        return f"Thumbnail created for {media_file.original_name}"

    except MediaFile.DoesNotExist:
        return "MediaFile not found"
    except Exception as e:
        return f"Error: {str(e)}"
