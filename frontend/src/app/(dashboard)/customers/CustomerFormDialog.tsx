"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { ApiError, getErrorMessage } from "@/api/client";
import { createCustomer, updateCustomer } from "@/api/customers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { Customer } from "@/types/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CustomerFormDialogProps {
  /** Verilirse düzenleme, verilmezse yeni müşteri formu açılır. */
  customer?: Customer;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

/**
 * Müşteri oluşturma ve düzenleme formu. Açıldığında render edilir,
 * kapandığında kaldırılır; böylece form her açılışta temiz başlar.
 */
export const CustomerFormDialog = ({
  customer,
  onClose,
  onSaved,
}: CustomerFormDialogProps) => {
  const isEditMode = customer !== undefined;

  const [firstName, setFirstName] = useState(customer?.firstName ?? "");
  const [lastName, setLastName] = useState(customer?.lastName ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!firstName.trim()) {
      errors.push("Ad zorunludur.");
    }
    if (!lastName.trim()) {
      errors.push("Soyad zorunludur.");
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      errors.push("Geçerli bir e-posta adresi girin.");
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrorMessages(validationErrors);
      return;
    }

    const formValues = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    };

    setIsSubmitting(true);
    setErrorMessages([]);

    try {
      let savedCustomer: Customer;
      if (isEditMode) {
        savedCustomer = await updateCustomer(customer.id, formValues);
        toast.success("Müşteri bilgileri güncellendi");
      } else {
        savedCustomer = await createCustomer(formValues);
        toast.success("Müşteri oluşturuldu");
      }
      onSaved(savedCustomer);
      onClose();
    } catch (error) {
      // Backend doğrulama hataları (400) alan bazında birden fazla mesaj döndürebilir.
      if (error instanceof ApiError) {
        setErrorMessages(error.messages);
      } else {
        setErrorMessages([getErrorMessage(error)]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Müşteriyi Düzenle" : "Yeni Müşteri"}
          </DialogTitle>
          <DialogDescription>
            Ad ve soyad yalnızca harf içerebilir. E-posta adresi benzersiz olmalıdır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {errorMessages.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="list-inside list-disc space-y-1">
                  {errorMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ad</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={100}
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Soyad</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={100}
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={255}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner aria-hidden="true" />}
              {isEditMode ? "Kaydet" : "Müşteri Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
