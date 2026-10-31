# MarutiCab WhatsApp Cloud API templates

Submit these as **UTILITY** templates in WhatsApp Manager using language `English (en)`. Variable values below are examples only. For URL buttons, define the fixed URL prefix shown and let the API append the dynamic suffix. Meta must approve each exact body and button configuration before live sends will work.

## 1. `booking_received_match`

**Body**

```text
Hi {{1}}, aapki MarutiCab Match Deal booking mil gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Advance Rs {{6}} mila. Hum aapka match dhundh rahe hain. Match na mila to Rs 500 poore wapas. Status dekhne ke liye neeche button dabaye.
```

**Examples:** `Ramesh` · `Khargone` · `Indore` · `5 Nov 2026` · `07:00` · `500`
**URL button:** `Check status` → `https://maruticab.in/booking/{{1}}` (dynamic suffix is the booking public token)

## 2. `booking_received_guaranteed`

**Body**

```text
Hi {{1}}, aapki MarutiCab booking mil gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Advance Rs {{6}} mila. Driver ki details ride se pehle bhej di jayengi.
```

**Examples:** `Ramesh` · `Khargone` · `Indore` · `5 Nov 2026` · `07:00` · `500`
**URL button:** `View booking` → `https://maruticab.in/booking/{{1}}` (dynamic suffix is the booking public token)

## 3. `match_confirmed_customer`

**Body**

```text
Good news {{1}}! Aapki ride confirm ho gayi. {{2}} se {{3}}, {{4}} ko {{5}} baje. Driver: {{6}}, Gaadi: {{7}}, Phone: {{8}}. Baaki Rs {{9}} gaadi mein dena hai.
```

**Examples:** `Ramesh` · `Khargone` · `Indore` · `5 Nov 2026` · `07:00` · `Amit` · `MP 09 AB 1234` · `9826012345` · `1500`
**URL button:** `View booking` → `https://maruticab.in/booking/{{1}}` (dynamic suffix is the booking public token)

## 4. `match_confirmed_driver`

**Body**

```text
Nayi ride: {{1}}, {{2}} baje. Pickup: {{3}} ({{4}}). Customer: {{5}}, {{6}}. Passengers: {{7}}. Customer se Rs {{8}} lena hai.
```

**Examples:** `Khargone to Indore` · `07:00` · `Bus Stand` · `5 Nov 2026` · `Ramesh` · `9826012345` · `2` · `1500`

## 5. `no_match_options`

**Body**

```text
Hi {{1}}, afsos hai ki {{2}} ko {{3}} baje ki aapki Match Deal ke liye abhi koi match nahi mila. Aap kya karna chahenge? Rs 500 refund, ya Rs {{4}} mein pakki private ride (upgrade).
```

**Examples:** `Ramesh` · `5 Nov 2026` · `07:00` · `3000`
**Quick replies:** `Refund karo` payload `REFUND:<booking-public-token>` · `Upgrade karo` payload `UPGRADE:<booking-public-token>`

## 6. `refund_processed`

**Body**

```text
Hi {{1}}, aapke Rs {{2}} refund kar diye gaye hain. Original payment method mein 5-7 working days mein aa jayenge. Dobara booking ke liye maruticab.in par aayein.
```

**Examples:** `Ramesh` · `500`

## 7. `ride_reminder_customer`

**Body**

```text
Reminder: aapki MarutiCab ride aaj {{1}} baje hai. Pickup: {{2}}. Driver {{3}} ({{4}}) aapko 30 minute pehle call karenge.
```

**Examples:** `07:00` · `Bus Stand Khargone` · `Amit` · `9826012345`

## 8. `ride_reminder_driver`

**Body**

```text
Reminder: {{1}} baje pickup, {{2}}. Customer {{3}} ({{4}}).
```

**Examples:** `07:00` · `Bus Stand Khargone` · `Ramesh` · `9826012345`

## 9. `feedback_request`

**Body**

```text
Hi {{1}}, MarutiCab mein safar karne ke liye dhanyavad! Aapka anubhav kaisa raha? Review dene ke liye neeche button dabaye, aur dost ko refer karein.
```

**Example:** `Ramesh`
**URL button:** `Give feedback` → `https://wa.me/917282316090?text=Feedback%20for%20MarutiCab`

## 10. `admin_alert`

**Body**

```text
MarutiCab alert: {{1}}. Booking {{2}}, {{3}} on {{4}} at {{5}}.
```

**Examples:** `New Match Deal request` · `MC12345` · `Khargone to Indore` · `5 Nov 2026` · `07:00`

## Local test

Set `WHATSAPP_MOCK=true` to exercise calls without sending anything to Meta. To send real tests, set `WHATSAPP_TEST_TO` to a Meta-approved test recipient and run `pnpm whatsapp:test` only after configuring an approved template and credentials. Never put tokens in this file or commit them.
