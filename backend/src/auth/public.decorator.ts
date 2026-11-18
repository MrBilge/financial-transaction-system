import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Tüm endpoint'ler varsayılan olarak JWT ile korunur (global guard).
 * Yalnızca bu decorator ile işaretlenen endpoint'ler herkese açıktır.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
