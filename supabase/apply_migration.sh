#!/bin/bash

# أشغل هذا الـ script للـ migration
# chmod +x apply_migration.sh
# ./apply_migration.sh

echo "🔄 تطبيق Migration 03..."
supabase db pull  # اسحب الـ schema الحالي

# ثم اذهب إلى Supabase Console وشغل SQL الأعلى
echo "✅ شغل الـ SQL commands في Supabase SQL Editor"
