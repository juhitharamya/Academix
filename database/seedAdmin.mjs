import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function getArg(name, fallback = '') {
  const idx = process.argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return fallback;
  const raw = process.argv[idx];
  if (raw.includes('=')) return raw.split('=').slice(1).join('=').trim();
  return String(process.argv[idx + 1] || fallback).trim();
}

function hashPassword(password) {
  const pw = String(password || '');
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

const email = getArg('--email');
const password = getArg('--password');
const name = getArg('--name', 'Admin');

if (!email || !password) {
  console.error('Usage: node database/seedAdmin.mjs --email <email> --password <password> [--name <name>]');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment (.env).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const faculty_id = String(email).trim().toLowerCase();
const passwordHash = hashPassword(password);

const { data: existing, error: findErr } = await supabase
  .from('users')
  .select('faculty_id,email,role')
  .eq('role', 'Admin')
  .maybeSingle();

if (findErr) {
  console.error('Failed to query users table:', findErr.message);
  process.exit(1);
}

if (!existing) {
  const { error: insErr } = await supabase.from('users').insert({
    faculty_id,
    name,
    email: faculty_id,
    password: passwordHash,
    department: '',
    role: 'Admin',
    status: 'Active',
  });

  if (insErr) {
    console.error('Failed to create admin:', insErr.message);
    process.exit(1);
  }

  console.log(`Created Admin: ${faculty_id}`);
  process.exit(0);
}

const { error: updErr } = await supabase
  .from('users')
  .update({ faculty_id, name, email: faculty_id, password: passwordHash, status: 'Active' })
  .eq('role', 'Admin');

if (updErr) {
  console.error('Failed to update admin:', updErr.message);
  process.exit(1);
}

console.log(`Updated Admin credentials: ${faculty_id}`);

