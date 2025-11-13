// src/presentation/components/admin/UserList.spec.ts

import { ref, type Ref } from 'vue';
import { mount, shallowMount } from '@vue/test-utils';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import UserList from './UserList.vue'; // Test edilecek bileşen
import UserCard from './UserCard.vue'; // UserList'in alt bileşeni

// User entity'sini ve value-object'leri mock'lamak için
// Gerçek sınıfları import edip mock data oluşturmak daha iyidir
import { User } from '@/core/entities/User';
import { UserStatus } from '@/core/value-objects/UserStatus';
import { UserRole } from '@/core/value-objects/UserRole';

// 1. Mock 'useUserManagement' composable'ı
// Bu, gerçek composable'ın çalışmasını engeller ve bizim kontrolümüzü sağlar.
const mockUsers: Ref<User[]> = ref([]);
const mockIsLoading = ref(false);
const mockError = ref<string | null>(null);
const mockHandleRefresh = vi.fn();
const mockHandleApprove = vi.fn();
const mockHandleSuspend = vi.fn();
const mockHandleMakeAdmin = vi.fn();

vi.mock('@/presentation/composables/admin/useUserManagement', () => ({
  useUserManagement: () => ({
    users: mockUsers,
    isLoading: mockIsLoading,
    error: mockError,
    handleRefresh: mockHandleRefresh,
    handleApprove: mockHandleApprove,
    handleSuspend: mockHandleSuspend,
    handleMakeAdmin: mockHandleMakeAdmin,
  }),
}));

// Mock UserCard bileşeni (shallowMount için)
// UserCard'ın iç mantığını test etmek istemiyoruz, sadece render edilip edilmediğini.
const UserCardStub = {
  template: '<div class="mock-user-card">{{ user.email }}</div>',
  props: ['user', 'loading'],
};

describe('UserList.vue', () => {
  // Her testten önce mock değerleri sıfırla
  beforeEach(() => {
    mockUsers.value = [];
    mockIsLoading.value = false;
    mockError.value = null;
    vi.clearAllMocks(); // Mock fonksiyon çağrılarını temizle
  });

  // Test 1: Yüklenme durumunu test et
  test('yüklenme durumunda "Yükleniyor..." metnini göstermeli', () => {
    mockIsLoading.value = true;

    // shallowMount, alt bileşenleri (UserCard) render etmek yerine stub (taklit) eder.
    const wrapper = shallowMount(UserList);

    // "Yükleniyor" metnini içeren bir element var mı?
    expect(wrapper.text()).toContain('Kullanıcılar yükleniyor...');
    // Liste render edilmemeli
    expect(wrapper.find('.grid').exists()).toBe(false);
  });

  // Test 2: Hata durumunu test et
  test('hata durumunda hata mesajını göstermeli', () => {
    mockError.value = 'Sunucuya bağlanılamadı.';
    const wrapper = shallowMount(UserList);

    expect(wrapper.text()).toContain('Sunucuya bağlanılamadı.');
    expect(wrapper.find('button.btn-secondary').text()).toContain('Tekrar Dene');
  });

  // Test 3: Boş liste durumunu test et
  test('kullanıcı listesi boşken "kullanıcı bulunmamaktadır" mesajını göstermeli', () => {
    // isLoading = false, error = null, users = [] (varsayılan)
    const wrapper = shallowMount(UserList);

    expect(wrapper.text()).toContain('Henüz kayıtlı kullanıcı bulunmamaktadır.');
  });

  // Test 4: Kullanıcı listesini render etme
  test('kullanıcı listesini doğru şekilde render etmeli', () => {
    // Mock data oluştur
    const mockUserData = [
      User.create({
        user_id: '1',
        email: 'test1@mail.com',
        display_name: 'Test 1',
        status: 'active',
        role: 'user',
        admin_approved: true,
        created_at: new Date(),
        updated_at: new Date(),
      }),
      User.create({
        user_id: '2',
        email: 'test2@mail.com',
        display_name: 'Test 2',
        status: 'pending',
        role: 'user',
        admin_approved: false,
        created_at: new Date(),
        updated_at: new Date(),
      }),
    ];
    mockUsers.value = mockUserData;

    // mount yerine shallowMount kullanarak UserCard'ı stub'luyoruz.
    const wrapper = shallowMount(UserList);

    // 2 adet UserCard bileşeni render edilmiş olmalı
    const userCards = wrapper.findAllComponents(UserCard);
    expect(userCards).toHaveLength(2);

    // İlk kartın doğru 'user' prop'unu aldığını kontrol et
    expect(userCards[0].props('user')).toBe(mockUserData[0]);
    expect(userCards[1].props('user')).toBe(mockUserData[1]);
  });

  // Test 5: Yenile butonuna tıklama
  test('"Yenile" butonuna tıklandığında handleRefresh fonksiyonunu çağırmalı', async () => {
    const wrapper = shallowMount(UserList);

    // 'Yenile' butonunu bul (spesifik bir class veya id vermek daha iyi olur)
    // Şimdilik text üzerinden bulalım
    const refreshButton = wrapper.findAll('button').find((btn) => btn.text() === 'Yenile');

    expect(refreshButton).toBeDefined();

    await refreshButton!.trigger('click');

    // Mock'ladığımız handleRefresh fonksiyonu çağrıldı mı?
    expect(mockHandleRefresh).toHaveBeenCalledTimes(1);
  });
});
