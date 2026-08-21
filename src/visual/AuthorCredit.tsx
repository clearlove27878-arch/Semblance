export const AUTHOR_CREDIT = '作者：Ragdollcat';

interface AuthorCreditProps {
  className?: string;
}

export function AuthorCredit({ className }: AuthorCreditProps) {
  return <p className={['author-credit', className].filter(Boolean).join(' ')}>{AUTHOR_CREDIT}</p>;
}

export default AuthorCredit;
