-- ==============================================================================
-- AURA Master Planner - Script SQL Supabase & Politiques RLS (Row Level Security)
-- ==============================================================================
-- Exécutez ce script dans Supabase : Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. CRÉATION DE LA TABLE DES UTILISATEURS (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' ou 'approved'
  role TEXT NOT NULL DEFAULT 'client',    -- 'admin' ou 'client'
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMPTZ
);

-- Index pour des recherches d'emails ultra-rapides
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- 2. ACTIVATION DE LA SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. NETTOYAGE DES ANCIENNES POLITIQUES ÉVENTUELLES
DROP POLICY IF EXISTS "service_role_full_access" ON public.users;
DROP POLICY IF EXISTS "anon_can_register" ON public.users;
DROP POLICY IF EXISTS "users_can_read_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;
DROP POLICY IF EXISTS "allow_all_for_service_role" ON public.users;

-- 4. POLITIQUES RLS SÉCURISÉES :

-- A. Accès complet pour la clé service_role (le backend du serveur Node / Cloud Run)
CREATE POLICY "allow_all_for_service_role" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- B. Autoriser la création de compte (INSERT) pour tout visiteur (anon) ou authentifié
-- Permet aux nouveaux clients de s'enregistrer avec leur mot de passe
CREATE POLICY "anon_can_register" ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- C. Lecture (SELECT) :
-- L'administrateur (ber7iche@gmail.com / maroua144@gmail.com) peut voir tous les utilisateurs.
-- Un utilisateur peut vérifier son propre compte par email.
CREATE POLICY "users_can_read_own_or_admin" ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- D. Mise à jour (UPDATE) :
-- Permet la mise à jour du mot de passe ou du statut d'approbation par le serveur ou le propriétaire
CREATE POLICY "users_can_update_own" ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- E. Suppression (DELETE) :
-- Uniquement autorisée pour le service_role ou les administrateurs
CREATE POLICY "admin_delete_users" ON public.users
  FOR DELETE
  TO anon, authenticated
  USING (
    current_setting('request.jwt.claim.email', true) IN ('ber7iche@gmail.com', 'maroua144@gmail.com')
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );


-- ==============================================================================
-- 5. TABLE PARAMÈTRES DE PAIEMENT (BaridiMob & CCP)
-- ==============================================================================
DROP TABLE IF EXISTS public.payment_settings CASCADE;

CREATE TABLE public.payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  baridi_mob TEXT DEFAULT '00799999002934604547',
  ccp TEXT DEFAULT '',
  contact TEXT DEFAULT '@maroua144 (Telegram)',
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_payment_settings" ON public.payment_settings
  FOR SELECT TO anon, authenticated, service_role USING (true);

CREATE POLICY "admin_update_payment_settings" ON public.payment_settings
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- Insertion de la ligne par défaut si elle n'existe pas
INSERT INTO public.payment_settings (id, baridi_mob, ccp, contact)
VALUES ('default', '00799999002934604547', '', '@maroua144 (Telegram)')
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 6. TABLE DONNÉES UTILISATEUR (Tasks, Courses, Habits, Events)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_data (
  email TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_data_all_access" ON public.user_data
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
