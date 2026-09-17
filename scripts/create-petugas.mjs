import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey || url.includes('your-supabase-project')) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local sebelum menjalankan skrip ini.'
  );
  process.exit(1);
}

const email = process.argv[2] || 'petugas@sigap.go.id';
const password = process.argv[3] || 'sigap2026';
const nama = process.argv[4] || 'Komandan Budi Santoso';
const institusi = process.argv[5] || 'Manggala Agni / BPBD Sumatera Selatan';
const role = process.argv[6] || 'ADMIN';

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nama, institusi, role },
});

if (error) {
  console.error('Gagal membuat user petugas:', error.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from('petugas')
  .upsert({ id: data.user.id, nama, email, institusi, role }, { onConflict: 'email' });

if (profileError) {
  console.warn('User dibuat, tetapi gagal upsert profil petugas:', profileError.message);
}

console.log('User petugas siap.');
console.log(`  Email    : ${email}`);
console.log(`  Password : ${password}`);
console.log(`  Institusi: ${institusi}`);
