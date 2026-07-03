import { type Evento, type Timestamp } from '@leela/core';
import { StyleSheet, Text, View } from 'react-native';

// Timestamp mock estruturalmente compatível com Firestore Timestamp
const makeTimestamp = (isoDate: string): Timestamp => {
  const ms = new Date(isoDate).getTime();
  const seconds = Math.floor(ms / 1000);
  return {
    seconds,
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
};

// Evento mock tipado — valida integração @leela/core ↔ mobile
const eventoMock: Evento = {
  id: 'corrida-leela-2026',
  tenantId: 'tenant-demo',
  organizadorId: 'prof-001',
  nome: 'Corrida Leela 2026',
  data: makeTimestamp('2026-09-20T08:00:00-03:00'),
  local: 'Parque Ibirapuera, São Paulo — SP',
  modalidades: ['5 km', '10 km', '21 km'],
  slug: 'corrida-leela-2026',
  status: 'publicado',
  usaChip: true,
  criadoEm: makeTimestamp('2026-07-01T00:00:00-03:00'),
  atualizadoEm: makeTimestamp('2026-07-01T00:00:00-03:00'),
  qtdInscritos: 0,
  receitaConfirmada: 0,
};

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leela Mobile</Text>
      <Text style={styles.subtitle}>{eventoMock.nome}</Text>
      <Text style={styles.info}>{eventoMock.local}</Text>
      <Text style={styles.info}>
        Modalidades: {eventoMock.modalidades.join(' · ')}
      </Text>
      <Text style={styles.badge}>{eventoMock.status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#e55',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
