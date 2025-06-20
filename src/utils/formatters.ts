export const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não for número
  const numbers = value.replace(/\D/g, '');
  
  // Verifica se é um número dos EUA (começa com +1 ou 1)
  const isUS = numbers.startsWith('1');
  
  if (isUS) {
    // Formato: +1 (XXX) XXX-XXXX
    return numbers
      .replace(/^(\d{1})(\d{3})(\d{3})(\d{4})$/, '+1 ($2) $3-$4')
      .replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')
      .slice(0, 17);
  }
  
  // Formato BR: (XX) XXXXX-XXXX
  return numbers
    .replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    .replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    .slice(0, 15);
};