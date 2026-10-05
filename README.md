# MediaVault

ذخیره‌ساز فایل با نمای گالری روی MinIO (سازگار با S3).
استک: Django + DRF + PostgreSQL + MinIO + JWT + Celery/Redis + Docker Compose.

## اجرا

```bash
cp .env.example .env        # مقادیر را در صورت نیاز تغییر دهید
docker compose up --build
docker compose exec web python manage.py migrate
```

| سرویس | آدرس |
|---|---|
| Django | http://localhost:8000 |
| MinIO API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 (کاربر/رمز از `.env`) |

## ساختار

```
backend/   پروژه Django (config/ = تنظیمات)
docker-compose.yml
.env.example
```

## نقشه راه

1. ✅ راه‌اندازی پروژه و Docker Compose
2. ✅ احراز هویت JWT
3. اتصال به MinIO
4. آپلود با اعتبارسنجی
5. Presigned URL
6. آلبوم و permission
7. Thumbnail با Celery
8. لینک اشتراک موقت
9. Pagination/فیلتر/جستجو
10. تست، Swagger، CI
