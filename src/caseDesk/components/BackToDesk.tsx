interface BackToDeskProps {
  onClick: () => void;
}

export function BackToDesk({ onClick }: BackToDeskProps) {
  return <button type="button" className="secondary-button back-to-desk" onClick={onClick}>回到案件桌</button>;
}

export default BackToDesk;
