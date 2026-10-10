import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from media.models import MediaFile
from media.tasks import generate_thumbnail
mf = MediaFile.objects.last()
print("MediaFile ID:", mf.id)
result = generate_thumbnail(mf.id)
print("Result:", result)
print("Thumbnail:", mf.thumbnail)
