import json

from django.test import Client, TestCase

from .models import MenuItem, Order, Reservation, Review


class ApiFlowTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.dish = MenuItem.objects.create(
            cat="pizza",
            price=3200,
            featured=True,
            active=True,
            img="https://example.com/pizza.jpg",
            name_kz="Маргарита",
            name_ru="Маргарита",
            name_en="Margherita",
            desc_kz="Сипаттама",
            desc_ru="Описание",
            desc_en="Description",
        )

    def post_json(self, url, payload, token=None):
        headers = {}
        if token:
            headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json",
            **headers,
        )

    def test_menu_register_login_profile_and_order(self):
        menu_res = self.client.get("/api/menu/")
        self.assertEqual(menu_res.status_code, 200)
        self.assertEqual(menu_res.json()[0]["name"]["en"], "Margherita")

        reg_res = self.post_json(
            "/api/auth/register/",
            {"email": "guest@example.com", "password": "StrongPass1!", "full_name": "Guest"},
        )
        self.assertEqual(reg_res.status_code, 201)

        login_res = self.post_json(
            "/api/auth/login/",
            {"username": "guest@example.com", "password": "StrongPass1!"},
        )
        self.assertEqual(login_res.status_code, 200)
        access = login_res.json()["access"]

        profile_res = self.client.patch(
            "/api/auth/profile/",
            data=json.dumps({"full_name": "Guest Updated", "phone": "+7 777 000 00 00"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        self.assertEqual(profile_res.status_code, 200)
        self.assertEqual(profile_res.json()["phone"], "+7 777 000 00 00")

        order_res = self.post_json(
            "/api/orders/",
            {
                "items": [{"dish_id": self.dish.id, "quantity": 2}],
                "notes": "No onions",
                "payment_method": "kaspi",
                "discount_percent": 10,
            },
            token=access,
        )
        self.assertEqual(order_res.status_code, 201)
        self.assertEqual(order_res.json()["payment_method"], "kaspi")
        self.assertEqual(order_res.json()["discount_amount"], 640)
        self.assertEqual(order_res.json()["total_amount"], 5760)
        self.assertEqual(Order.objects.count(), 1)

        reservation_res = self.post_json(
            "/api/reservations/",
            {
                "full_name": "Guest Updated",
                "phone": "+7 777 000 00 00",
                "date": "2026-05-20",
                "time": "19:30",
                "guests": 3,
                "notes": "Window table",
                "items": [{"dish_id": self.dish.id, "quantity": 1}],
            },
            token=access,
        )
        self.assertEqual(reservation_res.status_code, 201)
        self.assertEqual(reservation_res.json()["food_total"], 3200)
        self.assertEqual(Reservation.objects.count(), 1)
        self.assertEqual(Reservation.objects.first().items.count(), 1)

        review_res = self.post_json(
            "/api/reviews/",
            {"rating": 5, "text": "Great food and service"},
            token=access,
        )
        self.assertEqual(review_res.status_code, 201)
        self.assertEqual(Review.objects.count(), 1)
        reviews_list = self.client.get("/api/reviews/")
        self.assertEqual(reviews_list.status_code, 200)
        self.assertEqual(reviews_list.json()[0]["rating"], 5)

        chat_res = self.post_json("/api/chat/", {"message": "Hello", "lang": "en"})
        self.assertEqual(chat_res.status_code, 200)
        self.assertIn("Hello", chat_res.json()["reply"])
        chat_ru_res = self.post_json(
            "/api/chat/",
            {"message": "давай общаться на русском языке", "lang": "kz"},
        )
        self.assertEqual(chat_ru_res.status_code, 200)
        self.assertIn("русском", chat_ru_res.json()["reply"].lower())

        fav_add = self.post_json(f"/api/favorites/{self.dish.id}/", {}, token=access)
        self.assertEqual(fav_add.status_code, 200)
        fav_list = self.client.get("/api/favorites/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(fav_list.status_code, 200)
        self.assertEqual(fav_list.json()[0]["id"], self.dish.id)

        fav_remove = self.client.delete(f"/api/favorites/{self.dish.id}/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(fav_remove.status_code, 200)
        fav_list = self.client.get("/api/favorites/", HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(fav_list.json(), [])
