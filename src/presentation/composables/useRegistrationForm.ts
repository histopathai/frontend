import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth'; // Gerçek store'u kullan
import type { RegisterRequest } from '@/core/repositories/IAuthRepository';

// Form hata durumları için bir tip tanımlaması
interface RegistrationErrors {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
}

export function useRegistrationForm() {
  // Bağımlılıklar (Vue ve diğer kütüphaneler)
  const authStore = useAuthStore();
  const router = useRouter();
  const toast = useToast();

  // Form Veri Durumu (State)
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const displayName = ref('');

  // Hata Durumu (State)
  const errors = reactive<RegistrationErrors>({
    email: null,
    password: null,
    confirmPassword: null,
  });

  // --- Doğrulama Mantığı ---
  const validateForm = (): boolean => {
    // Önceki hataları temizle
    errors.email = null;
    errors.password = null;
    errors.confirmPassword = null;

    let valid = true;

    if (!email.value) {
      errors.email = 'E-posta adresi gerekli.';
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.value)) {
      errors.email = 'Geçerli bir e-posta adresi girin.';
      valid = false;
    }

    if (!password.value) {
      errors.password = 'Şifre gerekli.';
      valid = false;
    } else if (password.value.length < 8) {
      errors.password = 'Şifre en az 8 karakter olmalı.';
      valid = false;
    }

    if (password.value !== confirmPassword.value) {
      errors.confirmPassword = 'Şifreler eşleşmiyor.';
      valid = false;
    }

    return valid;
  };

  // --- Kayıt İşlemi Mantığı (Use Case) ---
  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      // Core katmanından gelen RegisterRequest tipini kullanıyoruz
      const payload: RegisterRequest = {
        email: email.value,
        password: password.value,
        displayName: displayName.value || '',
      };

      await authStore.register(payload); // Bu, infrastructure'ı tetikleyecek

      if (authStore.user) {
        toast.success('Kayıt başarılı! Yönetici onayı bekleniyor.');
        router.push('/auth/login');
      } else {
        toast.error(authStore.error || 'Kayıt başarısız.');
      }
    } catch (err: any) {
      console.error('Kayıt Hatası:', err);
      toast.error(authStore.error || err.message || 'Beklenmeyen bir hata oluştu.');
    }
  };
  return {
    email,
    password,
    confirmPassword,
    displayName,
    errors,
    isLoading: authStore.loading,
    handleRegister,
  };
}
