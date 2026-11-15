export function validateBookingFlow(data: Record<string, unknown>, now = new Date()) {
  const route = String(data.route || '')
  if (!['khargone_to_indore', 'indore_to_khargone'].includes(route)) return 'Kripya booking form mein valid route select karein.'
  const date = String(data.travel_date || '')
  const time = String(data.pickup_time || '').trim()
  const match = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(time)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !match) return 'Kripya form mein valid travel date aur pickup time select karein.'
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  const departure = new Date(`${date}T${String(hour).padStart(2, '0')}:${match[2]}:00+05:30`)
  const calendar = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date || !Number.isFinite(departure.getTime()) || departure <= now) return 'Travel date aur time future mein hona chahiye. Kripya form dobara bharein.'
  if (String(data.passenger_name || '').trim().length < 2) return 'Kripya passenger ka poora naam bharein.'
  const phone = String(data.passenger_phone || '').replace(/\D/g, '')
  if (!/^(?:91)?[6-9]\d{9}$/.test(phone)) return 'Kripya valid Indian mobile number bharein.'
  if (String(data.pickup_address || '').trim().length < 5) return 'Kripya pickup aur drop address details bharein.'
  if (data.passenger_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.passenger_email))) return 'Email address check karein, ya optional email field khaali rakhein.'
  return null
}
