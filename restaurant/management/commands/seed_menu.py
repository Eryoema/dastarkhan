from django.core.management.base import BaseCommand

from restaurant.models import MenuItem


MENU_ITEMS = [
    ("pizza", 3200, True, "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop", "Маргарита", "Маргарита", "Margherita", "Үй стиліндегі тесто, помидор соусы, моцарелла және базилик", "Тесто домашнего стиля, томатный соус, моцарелла и базилик", "Homestyle dough, tomato sauce, mozzarella and basil"),
    ("pizza", 3900, False, "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop", "Пепперони", "Пепперони", "Pepperoni", "Пепперони шұжығы, моцарелла, помидор соусы", "Колбаса пепперони, моцарелла, томатный соус", "Pepperoni sausage, mozzarella, tomato sauce"),
    ("pizza", 4200, False, "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&auto=format&fit=crop", "Төрт ірімшік", "Четыре сыра", "Four Cheese", "Моцарелла, горгонзола, пармезан және рикотта", "Моцарелла, горгонзола, пармезан и рикотта", "Mozzarella, gorgonzola, parmesan and ricotta"),
    ("pasta", 2800, True, "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&auto=format&fit=crop", "Карбонара", "Карбонара", "Carbonara", "Спагетти, бекон, жұмыртқа сарысы, пармезан", "Спагетти, бекон, яичный желток, пармезан", "Spaghetti, bacon, egg yolk, parmesan"),
    ("pasta", 2600, False, "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&auto=format&fit=crop", "Болоньезе", "Болоньезе", "Bolognese", "Тагиателле, ет соусы, помидор, базилик", "Тальятелле, мясной соус, помидор, базилик", "Tagliatelle, meat sauce, tomato, basil"),
    ("pasta", 3100, False, "https://images.unsplash.com/photo-1461009683693-342af2f2d6ce?w=600&auto=format&fit=crop", "Ризотто Арборио", "Ризотто Арборио", "Risotto Arborio", "Арборио күріші, пармезан, ақ шарап, сарымсақ", "Рис арборио, пармезан, белое вино, чеснок", "Arborio rice, parmesan, white wine, garlic"),
    ("steak", 7500, True, "https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop", "Рибай стейк", "Рибай стейк", "Ribeye Steak", "300г сиыр еті, розмарин майы", "300г говядина, масло с розмарином", "300g grass-fed beef, rosemary butter"),
    ("steak", 8900, False, "https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=600&auto=format&fit=crop", "Тендерлойн", "Тендерлойн", "Tenderloin", "250г, вырезка, трюфель соусы, картоп пюресі", "250г, вырезка, соус трюфель, картофельное пюре", "250g, tenderloin, truffle sauce, mashed potato"),
    ("steak", 6800, False, "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop", "Стриплойн", "Стриплойн", "Striploin", "280г, Нью-Йорк стейк, бұрыш соусы, гриль көкөністер", "280г, Нью-Йорк стейк, соус перец, гриль овощи", "280g, New York strip, pepper sauce, grilled vegetables"),
    ("salad", 1800, True, "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop", "Цезарь", "Цезарь", "Caesar", "Ромэн салаты, гренки, пармезан, цезарь тұздығы", "Салат ромэн, гренки, пармезан, соус цезарь", "Romaine lettuce, croutons, parmesan, caesar dressing"),
    ("salad", 2100, False, "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop", "Грек салаты", "Греческий салат", "Greek Salad", "Қияр, помидор, зәйтүн, фета ірімшігі, зәйтүн майы", "Огурец, томат, маслины, сыр фета, оливковое масло", "Cucumber, tomato, olives, feta cheese, olive oil"),
    ("dessert", 1500, True, "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600&auto=format&fit=crop", "Тирамису", "Тирамису", "Tiramisu", "Маскарпоне, савоярди, эспрессо, какао", "Маскарпоне, савоярди, эспрессо, какао", "Mascarpone, ladyfingers, espresso, cocoa"),
    ("dessert", 1300, False, "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop", "Шоколад фонданы", "Шоколадный фондан", "Chocolate Fondant", "Іші сұйық шоколадты кекс, ваниль балмұздағы", "Кекс с жидкой начинкой, ванильное мороженое", "Lava cake with liquid chocolate, vanilla ice cream"),
    ("dessert", 1100, False, "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop", "Панна котта", "Панна котта", "Panna Cotta", "Кілегей, ваниль, жидек соусы", "Сливки, ваниль, ягодный соус", "Cream, vanilla, berry sauce"),
    ("drink", 900, False, "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&auto=format&fit=crop", "Свежесоктар", "Свежевыжатые соки", "Fresh Juices", "Апельсин, жасыл алма, сәбіз немесе қызылша", "Апельсин, зеленое яблоко, морковь или свекла", "Orange, green apple, carrot or beetroot"),
    ("drink", 1200, False, "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop", "Коктейльдер", "Коктейли", "Cocktails", "Mojito, Aperol Spritz, Pina Colada немесе Virgin Colada", "Mojito, Aperol Spritz, Pina Colada или Virgin Colada", "Mojito, Aperol Spritz, Pina Colada or Virgin Colada"),
    ("drink", 700, False, "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop", "Эспрессо / Капучино", "Эспрессо / Капучино", "Espresso / Cappuccino", "Сингл немесе дубль эспрессо, капучино, латте", "Сингл или дубль эспрессо, капучино, латте", "Single or double espresso, cappuccino, latte"),
]


class Command(BaseCommand):
    help = "Seed initial DASTARKHAN menu items"

    def handle(self, *args, **options):
        created = 0
        for order, row in enumerate(MENU_ITEMS, start=10):
            cat, price, featured, img, name_kz, name_ru, name_en, desc_kz, desc_ru, desc_en = row
            _, was_created = MenuItem.objects.update_or_create(
                name_en=name_en,
                defaults={
                    "cat": cat,
                    "price": price,
                    "featured": featured,
                    "active": True,
                    "sort_order": order,
                    "img": img,
                    "name_kz": name_kz,
                    "name_ru": name_ru,
                    "desc_kz": desc_kz,
                    "desc_ru": desc_ru,
                    "desc_en": desc_en,
                },
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Menu seeded. Created: {created}, total: {MenuItem.objects.count()}"))
