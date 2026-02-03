
# Plan d'intégration MoneyFusion pour les paiements en temps réel

## Objectif
Remplacer CinetPay par MoneyFusion pour les paiements en temps réel. Le patient clique sur "Payer", est redirigé vers le portail MoneyFusion, et apres le paiement est redirige vers une page de succes/echec avec un recu telechargeable.

## Architecture du flux de paiement

```text
+----------------+     +------------------+     +------------------+
|   Patient      |---->| Edge Function    |---->| MoneyFusion API  |
|   (Frontend)   |     | (Initialize)     |     |                  |
+----------------+     +------------------+     +------------------+
        |                                              |
        |  Redirection vers URL de paiement            |
        v                                              |
+------------------+                                   |
| Portail MoneyFusion|<--------------------------------+
| (Paiement)         |
+------------------+
        |
        | return_url (succes/echec)
        v
+------------------+     +------------------+
| Page Callback    |<----| Webhook          |
| /payment/success |     | (Notification)   |
| /payment/failure |     +------------------+
+------------------+
        |
        | Affiche recu + redirection dashboard
        v
+------------------+
| Dashboard Patient|
+------------------+
```

## Fichiers a creer

### 1. Composant de paiement MoneyFusion
**Fichier:** `src/components/patient/MoneyFusionPayment.tsx`
- Formulaire avec numero de telephone pre-rempli
- Bouton "Payer maintenant" qui appelle l'edge function
- Affichage du montant et des modes de paiement (Orange, MTN, Moov, Wave)
- Redirection automatique vers l'URL MoneyFusion

### 2. Edge Function d'initialisation
**Fichier:** `supabase/functions/moneyfusion-initialize/index.ts`
- Recoit: amount, appointmentId, patientId, customerName, customerPhone
- Cree un enregistrement payment en base (status: pending)
- Appelle l'API MoneyFusion avec:
  - `totalPrice`: montant
  - `article`: description du paiement
  - `numeroSend`: telephone du patient
  - `nomclient`: nom du patient
  - `personal_Info`: [{appointmentId, patientId, paymentId}]
  - `return_url`: URL de la page succes/echec
  - `webhook_url`: URL du webhook Supabase
- Retourne l'URL de paiement MoneyFusion

### 3. Edge Function webhook
**Fichier:** `supabase/functions/moneyfusion-webhook/index.ts`
- Recoit les evenements:
  - `payin.session.pending`: log seulement
  - `payin.session.completed`: met a jour payment.status = 'success', confirme le RDV, envoie notifications
  - `payin.session.cancelled`: met a jour payment.status = 'failed'
- Utilise `tokenPay` pour identifier la transaction
- Envoie notifications au secretariat et au medecin uniquement apres paiement reussi

### 4. Edge Function verification
**Fichier:** `supabase/functions/moneyfusion-verify/index.ts`
- Appelle `https://www.pay.moneyfusion.net/paiementNotif/{token}`
- Retourne le statut: pending, paid, failure, no paid

### 5. Page de succes
**Fichier:** `src/pages/PaymentSuccess.tsx`
- Recupere le token depuis l'URL
- Appelle l'edge function de verification
- Si paiement reussi:
  - Affiche animation de succes
  - Affiche le recu avec toutes les informations
  - Boutons: Voir le recu, Telecharger, Retour au dashboard
- Si echec: affiche message d'erreur avec option de reessayer

### 6. Page d'echec
**Fichier:** `src/pages/PaymentFailure.tsx`
- Message d'echec avec raison si disponible
- Bouton pour reessayer ou retourner au dashboard

## Fichiers a modifier

### 1. App.tsx
Ajouter les routes:
- `/payment/success` -> PaymentSuccess
- `/payment/failure` -> PaymentFailure

### 2. FullBookingFlow.tsx
Remplacer `CinetPayPayment` par `MoneyFusionPayment`

### 3. supabase/config.toml
Ajouter les nouvelles edge functions:
- `moneyfusion-initialize` (verify_jwt = false)
- `moneyfusion-webhook` (verify_jwt = false)
- `moneyfusion-verify` (verify_jwt = false)

### 4. ReceiptCard.tsx
Ajouter le provider "moneyfusion" dans l'affichage

## Configuration requise

### Secret a ajouter
- `MONEYFUSION_API_URL`: URL de l'API MoneyFusion (fournie par l'utilisateur: `https://my.moneyfusion.net/697c93c41efb8281bec22b69`)

## Donnees envoyees a MoneyFusion

```json
{
  "totalPrice": 5000,
  "article": [{"consultation": 5000}],
  "numeroSend": "0700000000",
  "nomclient": "Jean Dupont",
  "personal_Info": [{
    "appointmentId": "uuid",
    "patientId": "uuid",
    "paymentId": "uuid"
  }],
  "return_url": "https://preview-url.lovable.app/payment/success?token=xxx",
  "webhook_url": "https://supabase-url/functions/v1/moneyfusion-webhook"
}
```

## Webhook MoneyFusion (evenement recu)

```json
{
  "event": "payin.session.completed",
  "tokenPay": "abc123",
  "numeroSend": "0700000000",
  "Montant": 5000,
  "statut": "paid",
  "personal_Info": [{
    "appointmentId": "uuid",
    "patientId": "uuid",
    "paymentId": "uuid"
  }]
}
```

## Page de succes - Contenu du recu

Le recu affiche:
- Numero de recu genere (format: KS-YYYYMMDD-XXXXXX)
- Date et heure du paiement
- Nom du patient
- Email du patient (si disponible)
- Nom du medecin
- Specialite
- Centre medical (si applicable)
- Date du RDV
- Type de paiement (Arrhes/Solde)
- Reference transaction MoneyFusion
- Montant paye
- Statut: PAYE

Actions disponibles:
- Voir le recu (popup modal)
- Telecharger en TXT
- Imprimer
- Retour au dashboard

## Flux de notifications apres paiement reussi

1. **Patient**: Notification "Paiement confirme" avec details
2. **Medecin**: Notification "Nouveau RDV confirme (paye)" avec nom patient et date
3. **Secretariat** (si clinique selectionnee): Notification "Nouveau RDV a traiter" avec toutes les infos

## Section technique

### Structure de la base de donnees utilisee

Table `payments`:
- `id`: UUID
- `appointment_id`: UUID (FK)
- `patient_id`: UUID (FK)
- `amount`: numeric
- `payment_type`: 'deposit' | 'balance'
- `provider`: 'moneyfusion'
- `transaction_ref`: string (tokenPay)
- `status`: 'pending' | 'success' | 'failed'
- `paid_at`: timestamp
- `created_at`: timestamp

### Gestion des doublons webhook

MoneyFusion peut envoyer plusieurs notifications pour la meme transaction. Le webhook:
1. Verifie si le paiement existe avec `tokenPay`
2. Verifie si deja traite (status = 'success')
3. Ignore les notifications redondantes
4. Met a jour uniquement si changement de statut

### URLs de callback

- **return_url** (succes): `{PREVIEW_URL}/payment/success?token={tokenPay}`
- **return_url** (echec): `{PREVIEW_URL}/payment/failure?token={tokenPay}`
- **webhook_url**: `{SUPABASE_URL}/functions/v1/moneyfusion-webhook`

### Securite

- L'API MoneyFusion n'est pas appelee directement depuis le frontend
- Toutes les operations passent par les edge functions
- Les secrets sont stockes dans Supabase
- Le webhook valide l'origine des requetes
