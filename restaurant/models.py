from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    full_name = models.CharField("Имя", max_length=160, blank=True)
    phone = models.CharField("Телефон", max_length=40, blank=True)

    class Meta:
        verbose_name = "Профиль"
        verbose_name_plural = "Профили"

    def __str__(self):
        return self.full_name or self.user.email or self.user.username


class MenuItem(models.Model):
    CATEGORY_CHOICES = [
        ("pizza", "Пицца"),
        ("pasta", "Паста"),
        ("steak", "Стейк"),
        ("salad", "Салат"),
        ("dessert", "Десерт"),
        ("drink", "Напиток"),
    ]

    cat = models.CharField("Категория", max_length=20, choices=CATEGORY_CHOICES)
    price = models.PositiveIntegerField("Цена, ₸")
    featured = models.BooleanField("Популярное", default=False)
    active = models.BooleanField("Показывать на сайте", default=True)
    sort_order = models.PositiveIntegerField("Порядок", default=100)
    img = models.URLField("Фото URL", max_length=600, blank=True)
    name_kz = models.CharField("Название KZ", max_length=160)
    name_ru = models.CharField("Название RU", max_length=160)
    name_en = models.CharField("Название EN", max_length=160)
    desc_kz = models.TextField("Описание KZ", blank=True)
    desc_ru = models.TextField("Описание RU", blank=True)
    desc_en = models.TextField("Описание EN", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "Позиция меню"
        verbose_name_plural = "Меню"

    def __str__(self):
        return f"{self.name_ru} - {self.price} ₸"


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Принят"),
        ("confirmed", "Подтвержден"),
        ("completed", "Выполнен"),
        ("cancelled", "Отменен"),
    ]
    PAYMENT_CHOICES = [
        ("cash", "Наличными"),
        ("card", "Картой"),
        ("kaspi", "Kaspi"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_method = models.CharField("Способ оплаты", max_length=20, choices=PAYMENT_CHOICES, default="cash")
    notes = models.TextField("Комментарий", blank=True)
    discount_percent = models.PositiveSmallIntegerField("Скидка, %", default=0)
    discount_amount = models.PositiveIntegerField("Сумма скидки, ₸", default=0)
    total_amount = models.PositiveIntegerField("Сумма, ₸", default=0)
    created_at = models.DateTimeField("Создан", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"

    def __str__(self):
        return f"Заказ #{self.pk} - {self.user.email or self.user.username}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    name = models.CharField("Название", max_length=160)
    quantity = models.PositiveIntegerField("Количество")
    unit_price = models.PositiveIntegerField("Цена за шт., ₸")

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказа"

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ("pending", "Принята"),
        ("confirmed", "Подтверждена"),
        ("completed", "Выполнена"),
        ("cancelled", "Отменена"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reservations",
        null=True,
        blank=True,
    )
    full_name = models.CharField("Имя", max_length=160)
    phone = models.CharField("Телефон", max_length=40)
    date = models.DateField("Дата")
    time = models.TimeField("Время")
    guests = models.PositiveIntegerField("Гостей", default=2)
    status = models.CharField("Статус", max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField("Комментарий", blank=True)
    food_total = models.PositiveIntegerField("Сумма предзаказа, ₸", default=0)
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        ordering = ["-date", "-time", "-created_at"]
        verbose_name = "Бронирование"
        verbose_name_plural = "Бронирования"

    def __str__(self):
        return f"{self.full_name} - {self.date} {self.time:%H:%M}"


class ReservationItem(models.Model):
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    name = models.CharField("Название", max_length=160)
    quantity = models.PositiveIntegerField("Количество")
    unit_price = models.PositiveIntegerField("Цена за шт., ₸")

    class Meta:
        verbose_name = "Блюдо к брони"
        verbose_name_plural = "Блюда к брони"

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "menu_item")
        ordering = ["-created_at"]
        verbose_name = "Избранное блюдо"
        verbose_name_plural = "Избранные блюда"

    def __str__(self):
        return f"{self.user.email or self.user.username} - {self.menu_item.name_ru}"


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    full_name = models.CharField("Имя", max_length=160)
    rating = models.PositiveSmallIntegerField("Оценка", default=5)
    text = models.TextField("Отзыв")
    approved = models.BooleanField("Показывать на сайте", default=True)
    created_at = models.DateTimeField("Создан", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"

    def __str__(self):
        return f"{self.full_name} - {self.rating}/5"
