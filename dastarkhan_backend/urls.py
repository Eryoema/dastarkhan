from django.conf import settings
from django.contrib import admin
from django.urls import path, re_path
from django.views.static import serve

from restaurant import views

urlpatterns = [
    path("", views.index, name="index"),
    path("admin/", admin.site.urls),
    path("api/menu/", views.menu_list, name="api-menu"),
    path("api/auth/register/", views.register, name="api-register"),
    path("api/auth/login/", views.login, name="api-login"),
    path("api/auth/token/refresh/", views.refresh_token, name="api-refresh"),
    path("api/auth/profile/", views.profile, name="api-profile"),
    path("api/favorites/", views.favorites, name="api-favorites"),
    path("api/favorites/<int:item_id>/", views.favorite_detail, name="api-favorite-detail"),
    path("api/orders/", views.orders, name="api-orders"),
    path("api/reviews/", views.reviews, name="api-reviews"),
    path("api/reservations/", views.reservations, name="api-reservations"),
    path("api/chat/", views.chat, name="api-chat"),
]

urlpatterns += [
    path("css/<path:path>", serve, {"document_root": settings.BASE_DIR / "css"}),
    path("js/<path:path>", serve, {"document_root": settings.BASE_DIR / "js"}),
    path("pdf/<path:path>", serve, {"document_root": settings.BASE_DIR / "pdf"}),
    re_path(r"^(?!admin/|api/|css/|js/|pdf/).*$", views.index, name="index-fallback"),
]
