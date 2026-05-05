import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.db import transaction
from django.http import FileResponse, JsonResponse
from django.utils.dateparse import parse_date, parse_time
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Favorite, MenuItem, Order, OrderItem, Profile, Reservation, ReservationItem, Review

TOKEN_SALT = "dastarkhan-api-token"
logger = logging.getLogger(__name__)


def index(request):
    return FileResponse(open(settings.BASE_DIR / "index.html", "rb"), content_type="text/html")


def parse_json(request):
    try:
        raw = request.body.decode("utf-8")
        return json.loads(raw) if raw else {}
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def error(message, status=400):
    return JsonResponse({"detail": message}, status=status)


def no_store(response):
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


def make_token(user, kind):
    return signing.dumps(
        {"uid": user.pk, "kind": kind, "iat": int(timezone.now().timestamp())},
        salt=TOKEN_SALT,
    )


def user_from_token(token, kind="access"):
    max_age = settings.ACCESS_TOKEN_MAX_AGE if kind == "access" else settings.REFRESH_TOKEN_MAX_AGE
    try:
        payload = signing.loads(token, salt=TOKEN_SALT, max_age=max_age)
    except signing.BadSignature:
        return None
    if payload.get("kind") != kind:
        return None
    User = get_user_model()
    try:
        return User.objects.get(pk=payload.get("uid"), is_active=True)
    except User.DoesNotExist:
        return None


def authenticated_user(request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return user_from_token(auth.split(" ", 1)[1], "access")


def serialize_menu_item(item):
    return {
        "id": item.id,
        "cat": item.cat,
        "price": item.price,
        "featured": item.featured,
        "img": item.img,
        "name": {"kz": item.name_kz, "ru": item.name_ru, "en": item.name_en},
        "desc": {"kz": item.desc_kz, "ru": item.desc_ru, "en": item.desc_en},
    }


def serialize_favorite(favorite):
    return serialize_menu_item(favorite.menu_item)


def serialize_order(order):
    return {
        "id": order.id,
        "status": order.status,
        "payment_method": order.payment_method,
        "notes": order.notes,
        "discount_percent": order.discount_percent,
        "discount_amount": order.discount_amount,
        "total_amount": order.total_amount,
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in order.items.all()
        ],
    }


def serialize_reservation(reservation):
    return {
        "id": reservation.id,
        "status": reservation.status,
        "full_name": reservation.full_name,
        "phone": reservation.phone,
        "date": reservation.date.isoformat(),
        "time": reservation.time.strftime("%H:%M"),
        "guests": reservation.guests,
        "notes": reservation.notes,
        "food_total": reservation.food_total,
        "created_at": reservation.created_at.isoformat(),
        "items": [
            {
                "name": item.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in reservation.items.all()
        ],
    }


def serialize_review(review):
    return {
        "id": review.id,
        "full_name": review.full_name,
        "rating": review.rating,
        "text": review.text,
        "created_at": review.created_at.isoformat(),
    }


def detect_chat_lang(message, requested=None):
    lowered = message.lower()
    if any(word in lowered for word in ["на русском", "по-русски", "по русски", "русский", "русском"]):
        return "ru"
    if any(word in lowered for word in ["қазақша", "казахском", "казахский", "қазақ"]):
        return "kz"
    if any(word in lowered for word in ["in english", "english", "английском", "английский"]):
        return "en"
    if any(ch in lowered for ch in "әғқңөұүіһ"):
        return "kz"
    english_words = ["hello", "hi", "menu", "book", "reserve", "order", "price", "where", "address", "payment"]
    if any(word in lowered for word in english_words) or lowered.isascii():
        return "en"
    if any("а" <= ch <= "я" or ch == "ё" for ch in lowered):
        return "ru"
    if requested in {"kz", "ru", "en"}:
        return requested
    return "ru"


def chat_text(lang, kz, ru, en):
    return {"kz": kz, "ru": ru, "en": en}.get(lang, ru)


def local_chat_reply(message, lang=None):
    lang = detect_chat_lang(message, lang)
    lowered = message.lower()
    category_words = {
        "salad": ["салат", "салаты", "salad", "salads", "көкөніс"],
        "pizza": ["пицца", "pizza", "пицца"],
        "pasta": ["паста", "pasta", "спагетти", "кеспе"],
        "steak": ["стейк", "стейки", "steak", "steaks", "ет", "мясо"],
        "dessert": ["десерт", "десерты", "dessert", "desserts", "тәтті", "сладкое"],
        "drink": ["напит", "сусын", "drink", "drinks", "шай", "чай", "juice", "сок"],
    }
    greetings = ["hello", "hi", "hey", "привет", "здравствуйте", "сәлем", "салем", "қайырлы"]
    if any(word in lowered for word in ["на русском", "по-русски", "по русски", "русский", "русском"]):
        return "Хорошо, давайте общаться на русском. Я могу помочь с меню, ценами, бронированием, оплатой, скидками и заказами."
    if any(word in lowered for word in ["қазақша", "казахском", "казахский", "қазақ"]):
        return "Жақсы, қазақша сөйлесейік. Мәзір, баға, брондау, төлем, жеңілдіктер және тапсырыс бойынша көмектесемін."
    if any(word in lowered for word in ["in english", "english", "английском", "английский"]):
        return "Sure, let's speak English. I can help with the menu, prices, reservations, payment, discounts, and orders."
    if any(word in lowered for word in greetings):
        return chat_text(
            lang,
            "Сәлем! Мен DASTARKHAN көмекшісімін. Мәзір, брондау, төлем, жеңілдіктер немесе тапсырыс туралы сұрай аласыз.",
            "Здравствуйте! Я помощник DASTARKHAN. Могу подсказать по меню, бронированию, оплате, скидкам и заказам.",
            "Hello! I am the DASTARKHAN assistant. I can help with the menu, reservations, payment, discounts, and orders.",
        )

    for category, words in category_words.items():
        if any(word in lowered for word in words):
            items = MenuItem.objects.filter(active=True, cat=category).order_by("sort_order", "id")
            if not items:
                return chat_text(
                    lang,
                    "Қазір бұл санатта қолжетімді тағам жоқ.",
                    "Сейчас в этой категории нет доступных позиций.",
                    "There are no available items in this category right now.",
                )
            def item_name(item):
                if lang == "kz":
                    return item.name_kz
                if lang == "en":
                    return item.name_en
                return item.name_ru
            lines = [f"{item_name(item)} - {item.price} ₸" for item in items[:8]]
            prefix = chat_text(lang, "Мына тағамдар бар:", "Есть такие позиции:", "Here are some options:")
            return prefix + "\n" + "\n".join(lines)

    if any(word in lowered for word in ["брон", "reserve", "book", "үстел", "стол"]):
        return chat_text(
            lang,
            "Үстел брондау үшін сайттағы 'Үстел брондау' батырмасын басыңыз. Егер аккаунтқа кірсеңіз, аты-жөніңіз бен телефоныңыз автоматты толтырылады. Сол жерде алдын ала тағам да таңдауға болады.",
            "Чтобы забронировать стол, нажмите кнопку 'Бронирование'. Если вы вошли в аккаунт, имя и телефон заполнятся автоматически. Там же можно заранее выбрать блюда.",
            "To reserve a table, press 'Table reservation'. If you are logged in, your name and phone are filled automatically. You can also preorder dishes there.",
        )
    if any(word in lowered for word in ["меню", "menu", "баға", "цена", "price", "price"]):
        count = MenuItem.objects.filter(active=True).count()
        return chat_text(
            lang,
            f"Қазір мәзірде {count} тағам бар. Бағаны нақты тағам бойынша сұрасаңыз, мен сол санаттағы бірнеше нұсқаны көрсетемін.",
            f"Сейчас в меню {count} позиций. Спросите про конкретную категорию, и я покажу подходящие блюда с ценами.",
            f"There are {count} menu items right now. Ask about a category and I will show matching dishes with prices.",
        )
    if any(word in lowered for word in ["адрес", "мекен", "address"]):
        return chat_text(
            lang,
            "Біздің мекенжай: Алматы қ., Абай даңғылы, 150. Жұмыс уақыты: күн сайын 10:00-23:00.",
            "Наш адрес: Алматы, проспект Абая, 150. Часы работы: каждый день 10:00-23:00.",
            "Our address is 150 Abay Ave, Almaty. Hours: every day 10:00-23:00.",
        )
    if any(word in lowered for word in ["оплат", "төлем", "payment", "pay", "kaspi", "карта"]):
        return chat_text(
            lang,
            "Тапсырыста төлем тәсілін таңдауға болады: қолма-қол, карта немесе Kaspi.",
            "В корзине можно выбрать способ оплаты: наличными, картой или Kaspi.",
            "In the cart you can choose a payment method: cash, card, or Kaspi.",
        )
    if any(word in lowered for word in ["скид", "жеңіл", "discount", "кубик", "виктор"]):
        return chat_text(
            lang,
            "Жеңілдік алу үшін жоғарғы мәзірдегі кубик ойынын ойнаңыз. Дұрыс жауап берсеңіз, жеңілдік себетке қосылады.",
            "Чтобы получить скидку, сыграйте в игру с кубиком в верхнем меню. Если ответите правильно, скидка применится в корзине.",
            "To get a discount, play the dice quiz in the top menu. If you answer correctly, the discount is applied in the cart.",
        )
    return chat_text(
        lang,
        "Мен сізге мәзір, бағалар, брондау, төлем және жеңілдіктер бойынша көмектесе аламын. Мысалы: 'пицца бар ма?', 'үстел брондау', 'Kaspi бар ма?'",
        "Я могу помочь с меню, ценами, бронированием, оплатой и скидками. Например: 'какие есть салаты?', 'забронировать стол', 'можно Kaspi?'",
        "I can help with the menu, prices, reservations, payment, and discounts. For example: 'what pizzas do you have?', 'book a table', 'do you accept Kaspi?'",
    )


def menu_context():
    items = MenuItem.objects.filter(active=True).order_by("sort_order", "id")[:40]
    lines = []
    for item in items:
        lines.append(f"- {item.name_ru} / {item.name_kz} / {item.name_en}: {item.price} KZT, category {item.cat}. {item.desc_ru}")
    return "\n".join(lines)


def gemini_reply(message, lang=None):
    if not settings.GEMINI_API_KEY:
        return None

    system_prompt = (
        "You are the polite restaurant assistant for DASTARKHAN in Almaty. "
        "Answer briefly and helpfully in the requested language when possible. "
        "Use only the restaurant facts and menu below. Do not invent unavailable dishes, prices, bookings, or discounts. "
        "For booking, tell the guest to use the table reservation form on the site. "
        "Restaurant address: Almaty, Abay Ave, 150. Phone: +7 (727) 123-45-67. Hours: Monday-Sunday 10:00-23:00.\n\n"
        f"Requested language code: {lang or 'auto'}.\n"
        f"Current menu:\n{menu_context()}"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": f"{system_prompt}\n\nGuest question: {message}",
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 350,
        },
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.GEMINI_API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("Gemini chat fallback used: %s", exc)
        return None

    candidates = data.get("candidates") or []
    if not candidates:
        return None
    parts = (((candidates[0].get("content") or {}).get("parts")) or [])
    text = "".join(part.get("text", "") for part in parts).strip()
    return text or None


@require_http_methods(["GET"])
def menu_list(request):
    items = MenuItem.objects.filter(active=True).order_by("sort_order", "id")
    return no_store(JsonResponse([serialize_menu_item(item) for item in items], safe=False))


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if not email or "@" not in email:
        return error("Введите корректный email")
    if len(password) < 8:
        return error("Пароль должен быть не короче 8 символов")

    User = get_user_model()
    if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
        return error("Пользователь с таким email уже существует")

    user = User.objects.create_user(username=email, email=email, password=password)
    Profile.objects.create(user=user, full_name=full_name)
    return JsonResponse({"id": user.id, "email": user.email}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    username = (data.get("username") or data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = authenticate(request, username=username, password=password)
    if user is None:
        return error("Неверный email или пароль", status=401)

    Profile.objects.get_or_create(user=user)
    return JsonResponse(
        {
            "access": make_token(user, "access"),
            "refresh": make_token(user, "refresh"),
            "user": {"id": user.id, "email": user.email},
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def refresh_token(request):
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    token = data.get("refresh") or ""
    user = user_from_token(token, "refresh")
    if user is None:
        return error("Сессия истекла", status=401)
    return JsonResponse({"access": make_token(user, "access")})


@csrf_exempt
@require_http_methods(["GET", "PATCH"])
def profile(request):
    user = authenticated_user(request)
    if user is None:
        return error("Требуется вход", status=401)

    prof, _ = Profile.objects.get_or_create(user=user)
    if request.method == "PATCH":
        data = parse_json(request)
        if data is None:
            return error("Некорректный JSON")
        prof.full_name = (data.get("full_name") or "").strip()
        prof.phone = (data.get("phone") or "").strip()
        prof.save(update_fields=["full_name", "phone"])

    return JsonResponse(
        {
            "email": user.email,
            "full_name": prof.full_name,
            "phone": prof.phone,
        }
    )


@csrf_exempt
@require_http_methods(["GET"])
def favorites(request):
    user = authenticated_user(request)
    if user is None:
        return error("Требуется вход", status=401)
    favs = Favorite.objects.filter(user=user, menu_item__active=True).select_related("menu_item")
    return no_store(JsonResponse([serialize_favorite(fav) for fav in favs], safe=False))


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
def favorite_detail(request, item_id):
    user = authenticated_user(request)
    if user is None:
        return error("Требуется вход", status=401)
    item = get_object_or_none(MenuItem, pk=item_id, active=True)
    if item is None:
        return error("Блюдо не найдено", status=404)

    if request.method == "POST":
        Favorite.objects.get_or_create(user=user, menu_item=item)
        return JsonResponse({"ok": True, "favorite": True, "item": serialize_menu_item(item)})

    Favorite.objects.filter(user=user, menu_item=item).delete()
    return JsonResponse({"ok": True, "favorite": False})


def get_object_or_none(model, **kwargs):
    try:
        return model.objects.get(**kwargs)
    except model.DoesNotExist:
        return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def orders(request):
    user = authenticated_user(request)
    if user is None:
        return error("Требуется вход", status=401)

    if request.method == "GET":
        user_orders = (
            Order.objects.filter(user=user)
            .prefetch_related("items")
            .order_by("-created_at")
        )
        return JsonResponse([serialize_order(order) for order in user_orders], safe=False)

    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    rows = data.get("items") or []
    notes = (data.get("notes") or "").strip()
    payment_method = (data.get("payment_method") or "cash").strip()
    allowed_payments = {choice[0] for choice in Order.PAYMENT_CHOICES}
    if payment_method not in allowed_payments:
        payment_method = "cash"
    try:
        discount_percent = int(data.get("discount_percent") or 0)
    except (TypeError, ValueError):
        discount_percent = 0
    if discount_percent not in (0, 5, 10, 15):
        discount_percent = 0
    if not rows:
        return error("Корзина пустая")

    with transaction.atomic():
        order = Order.objects.create(user=user, notes=notes, payment_method=payment_method)
        total = 0
        for row in rows:
            dish_id = row.get("dish_id")
            try:
                quantity = int(row.get("quantity") or 0)
            except (TypeError, ValueError):
                quantity = 0
            if quantity <= 0:
                continue
            try:
                dish = MenuItem.objects.get(pk=dish_id, active=True)
            except MenuItem.DoesNotExist:
                order.delete()
                return error("Одна из позиций меню больше недоступна")
            total += dish.price * quantity
            OrderItem.objects.create(
                order=order,
                menu_item=dish,
                name=dish.name_ru,
                quantity=quantity,
                unit_price=dish.price,
            )
        if total <= 0:
            order.delete()
            return error("Корзина пустая")
        discount_amount = total * discount_percent // 100
        order.discount_percent = discount_percent
        order.discount_amount = discount_amount
        order.total_amount = max(0, total - discount_amount)
        order.save(update_fields=["discount_percent", "discount_amount", "total_amount"])

    return JsonResponse(serialize_order(order), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def reviews(request):
    if request.method == "GET":
        rows = Review.objects.filter(approved=True).order_by("-created_at")[:12]
        return no_store(JsonResponse([serialize_review(review) for review in rows], safe=False))

    user = authenticated_user(request)
    if user is None:
        return error("Требуется вход", status=401)
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    text = (data.get("text") or "").strip()
    try:
        rating = int(data.get("rating") or 5)
    except (TypeError, ValueError):
        rating = 5
    rating = max(1, min(5, rating))
    if len(text) < 5:
        return error("Напишите отзыв чуть подробнее")

    prof, _ = Profile.objects.get_or_create(user=user)
    full_name = prof.full_name or user.email or user.username
    review = Review.objects.create(user=user, full_name=full_name, rating=rating, text=text)
    return JsonResponse(serialize_review(review), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def reservations(request):
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")

    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    reserve_date = parse_date((data.get("date") or "").strip())
    reserve_time = parse_time((data.get("time") or "").strip())
    notes = (data.get("notes") or "").strip()
    rows = data.get("items") or []

    try:
        guests = int(data.get("guests") or 0)
    except (TypeError, ValueError):
        guests = 0

    if not full_name:
        return error("Введите имя")
    if not phone:
        return error("Введите телефон")
    if reserve_date is None:
        return error("Выберите дату")
    if reserve_time is None:
        return error("Выберите время")
    if guests <= 0:
        return error("Укажите количество гостей")

    user = authenticated_user(request)

    with transaction.atomic():
        reservation = Reservation.objects.create(
            user=user,
            full_name=full_name,
            phone=phone,
            date=reserve_date,
            time=reserve_time,
            guests=guests,
            notes=notes,
        )
        total = 0
        for row in rows:
            dish_id = row.get("dish_id")
            try:
                quantity = int(row.get("quantity") or 0)
            except (TypeError, ValueError):
                quantity = 0
            if quantity <= 0:
                continue
            try:
                dish = MenuItem.objects.get(pk=dish_id, active=True)
            except MenuItem.DoesNotExist:
                reservation.delete()
                return error("Одна из позиций меню больше недоступна")
            total += dish.price * quantity
            ReservationItem.objects.create(
                reservation=reservation,
                menu_item=dish,
                name=dish.name_ru,
                quantity=quantity,
                unit_price=dish.price,
            )
        reservation.food_total = total
        reservation.save(update_fields=["food_total"])

    return JsonResponse(serialize_reservation(reservation), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def chat(request):
    data = parse_json(request)
    if data is None:
        return error("Некорректный JSON")
    message = (data.get("message") or "").strip()
    lang = data.get("lang") if data.get("lang") in {"kz", "ru", "en"} else None
    if not message:
        return error("Введите вопрос")

    reply = gemini_reply(message, lang) or local_chat_reply(message, lang)

    return JsonResponse({"reply": reply})
