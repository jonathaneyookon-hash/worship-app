import React, { useState } from 'react';
import ConnectionsScreen from './ConnectionsScreen';
import Remote from './Remote';

export default function App() {
  const [active, setActive] = useState(null);

  if (active) {
    return <Remote connection={active} onBack={() => setActive(null)} />;
  }
  return <ConnectionsScreen onSelect={setActive} />;
}
