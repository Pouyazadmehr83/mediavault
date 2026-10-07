from django.conf import settings
from django.core.management.base import BaseCommand
from botocore.exceptions import ClientError
import boto3


class Command(BaseCommand):

    def handle(self, *args, **options):
        client = boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
        )

        try:
            client.head_bucket(
                Bucket=settings.MINIO_BUCKET
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Bucket '{settings.MINIO_BUCKET}' already exists."
                )
            )

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")

            if error_code == "404":
                client.create_bucket(
                    Bucket=settings.MINIO_BUCKET
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Bucket '{settings.MINIO_BUCKET}' created."
                    )
                )
            else:
                raise