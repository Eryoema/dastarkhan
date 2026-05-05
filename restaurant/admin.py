from django.contrib import admin

from .models import Favorite, MenuItem, Order, OrderItem, Profile, Reservation, ReservationItem, Review


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ("name_ru", "cat", "price", "featured", "active", "sort_order", "updated_at")
    list_editable = ("price", "featured", "active", "sort_order")
    list_filter = ("cat", "featured", "active")
    search_fields = ("name_kz", "name_ru", "name_en", "desc_ru")
    fieldsets = (
        ("Основное", {"fields": ("cat", "price", "featured", "active", "sort_order", "img")}),
        ("Казахский", {"fields": ("name_kz", "desc_kz")}),
        ("Русский", {"fields": ("name_ru", "desc_ru")}),
        ("English", {"fields": ("name_en", "desc_en")}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "full_name", "phone")
    search_fields = ("user__email", "user__username", "full_name", "phone")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("menu_item", "name", "quantity", "unit_price")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "payment_method", "discount_percent", "discount_amount", "total_amount", "created_at")
    list_editable = ("status",)
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("user__email", "user__username", "items__name")
    readonly_fields = ("user", "payment_method", "notes", "discount_percent", "discount_amount", "total_amount", "created_at")
    inlines = [OrderItemInline]


class ReservationItemInline(admin.TabularInline):
    model = ReservationItem
    extra = 0
    readonly_fields = ("menu_item", "name", "quantity", "unit_price")
    can_delete = False


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "phone", "date", "time", "guests", "status", "food_total", "created_at")
    list_editable = ("status",)
    list_filter = ("status", "date", "created_at")
    search_fields = ("full_name", "phone", "user__email", "items__name")
    readonly_fields = ("user", "full_name", "phone", "date", "time", "guests", "notes", "food_total", "created_at")
    inlines = [ReservationItemInline]


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "menu_item", "created_at")
    list_filter = ("created_at", "menu_item__cat")
    search_fields = ("user__email", "user__username", "menu_item__name_ru", "menu_item__name_en")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "rating", "approved", "created_at")
    list_editable = ("approved",)
    list_filter = ("approved", "rating", "created_at")
    search_fields = ("full_name", "user__email", "text")
    readonly_fields = ("user", "full_name", "rating", "text", "created_at")
