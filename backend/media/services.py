from django.conf import settings
import boto3


def generate_presigned_url(media_file):
    s3_client = boto3.client(
        "s3",
        endpoint_url=settings.MINIO_PUBLIC_ENDPOINT,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
    )

    presigned_url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": media_file.file.name,
        },
        ExpiresIn=settings.PRESIGNED_URL_EXPIRE_SECONDS,
    )

    return presigned_url