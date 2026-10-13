from django.conf import settings
import boto3


def _public_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.MINIO_PUBLIC_ENDPOINT,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
    )


def generate_presigned_url(media_file, field="file", as_attachment=False):
    key = getattr(media_file, field).name
    if not key:
        return None

    params = {
        "Bucket": settings.MINIO_BUCKET,
        "Key": key,
    }
    if as_attachment:
        filename = media_file.original_name.replace('"', "")
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

    return _public_s3_client().generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=settings.PRESIGNED_URL_EXPIRE_SECONDS,
    )
