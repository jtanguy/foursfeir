# ADR: Simplification de l'architecture hexagonale pour une application Remix en TypeScript

## Contexte

Notre application Remix en TypeScript nécessite une meilleure modularisation du code. L'architecture hexagonale a été identifiée comme une approche potentielle, mais sa mise en œuvre complète pourrait introduire une complexité excessive.

## Décision

Nous avons décidé d'adopter une version simplifiée de l'architecture hexagonale qui conserve les avantages principaux tout en réduisant les abstractions et la complexité.

## Structure adoptée

```
src/
├── domain/                  # Logique métier
│   ├── models/              # Entités et types
│   └── services/            # Services métier
├── infrastructure/          # Implémentations techniques
│   ├── db/                  # Accès aux données
│   └── api/                 # Clients API externes
└── app/                     # Code Remix standard
    ├── routes/
    └── components/
```

## Détails de l'implémentation

### 1. Services de domaine sans interfaces explicites

```typescript
// src/domain/services/UserService.ts
export class UserService {
  constructor(private db: any) {}  // Injection directe de la dépendance

  async getUserById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }
  
  async updateUser(id: string, data: Partial<User>) {
    // Logique métier de validation
    return this.db.user.update({ where: { id }, data });
  }
}
```

### 2. Registre de services global

```typescript
// src/infrastructure/serviceRegistry.ts
import { PrismaClient } from '@prisma/client';
import { UserService } from '~/domain/services/UserService';

// Singleton pour Prisma
const prisma = new PrismaClient();

// Services pré-instanciés
export const services = {
  userService: new UserService(prisma),
  // autres services...
};
```

### 3. Utilisation dans les routes Remix

```typescript
// app/routes/users.$userId.tsx
import { services } from "~/infrastructure/serviceRegistry";

export async function loader({ params }: LoaderArgs) {
  const user = await services.userService.getUserById(params.userId);
  
  if (!user) {
    throw new Response("Not Found", { status: 404 });
  }
  
  return json({ user });
}
```

### 4. Clients d'API externes simplifiés

```typescript
// src/infrastructure/api/paymentClient.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY);

export const paymentClient = {
  processPayment: async (amount: number, token: string) => {
    try {
      const result = await stripe.charges.create({
        amount,
        currency: 'eur',
        source: token,
      });
      return { success: true, transactionId: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

## Conséquences

### Avantages

1. **Réduction de la complexité** : Moins de fichiers et d'abstractions à gérer
2. **Meilleure lisibilité** : Flux de code plus direct et facile à suivre
3. **Maintenabilité améliorée** : Structure claire avec moins d'indirection
4. **Testabilité préservée** : Les services restent isolés et facilement testables
5. **Séparation des préoccupations** : La logique métier reste distincte de l'infrastructure et de l'UI

### Inconvénients

1. **Couplage légèrement plus fort** : L'absence d'interfaces formelles peut réduire la flexibilité pour changer d'implémentation
2. **Moins d'explicitation des contrats** : Les interfaces implicites peuvent rendre les contrats moins évidents

## Statut

Adopté

## Références

- Architecture hexagonale (Ports & Adapters) par Alistair Cockburn
- Documentation de Remix sur l'organisation du code