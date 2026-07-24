# AudioFix Web — Application Web de Diagnostic Audio & Anti-Grésillement

Bienvenue dans la version Web d'**AudioFix**, conçue pour diagnostiquer et éliminer définitivement les **grésillements, craquements, pops et micro-coupures sonores** sous Windows (10 et 11).

---

## 🌟 Pourquoi une Interface Web au lieu d'un fichier Exécutable (.exe) ?

1. **Aucun Risque d'Antivirus / Faux Positifs** : Les petits `.exe` compilés déclenchent souvent Windows Defender ou SmartScreen. Une application Web standard s'exécute directement et en toute sécurité dans votre navigateur (Chrome, Edge, Firefox, Brave, Opera).
2. **Accès aux API Audio Web Avancées** : Grâce à l'API Web Audio native du navigateur, l'application peut mesurer en temps réel la fréquence d'échantillonnage de la carte son, la latence du tampon audio (buffer latency), le nombre de canaux et afficher un oscilloscope/spectrogramme temps réel.
3. **Zéro Installation** : Double-cliquez simplement sur `index.html` pour ouvrir l'outil instantanément.

---

## 🎯 Fonctionnalité Principale : Comparatif "Actuel" vs "Recommandé"

Pour chaque recommandation susceptible de causer des grésillements sonores, l'application affiche de manière claire et contrastée :

| Recommandation | Réglage Actuel | Réglage Recommandé | Raison du Grésillement |
| :--- | :--- | :--- | :--- |
| **Fréquence d'Échantillonnage** | `Actuel : 44 100 Hz` (ou détecté) | `Recommandé : 48 000 Hz` | La conversion dynamique à la volée entre 44.1 kHz et 48 kHz provoque des micro-interpolations et des clics sonores. |
| **Profondeur Binaire (Bits)** | `Actuel : 16 bits` (sélectionnable) | `Recommandé : 24 bits` | Le 16 bits réduit la réserve dynamique audio et favorise le clipping. |
| **Latence & Tampon (Buffer)** | `Actuel : ~12.5 ms` | `Recommandé : 10 - 20 ms` | Une latence trop faible (< 8ms) sature le buffer audio (Buffer Underrun). |
| **Améliorations Audio Windows** | `Actuel : Activé / Désactivé` | `Recommandé : Désactivé` | Les effets DSP (APO) provoquent des pics de charge processeur audio. |
| **Mode Exclusif** | `Actuel : Autorisé / Désactivé` | `Recommandé : Mode Partagé` | Empêche le hachage audio lorsque deux applications (ex: Jeu + Discord) s'affrontent. |
| **Alimentation USB & DAC** | `Actuel : Économie Active` | `Recommandé : Désactivée` | Évite les craquements lors des sorties de mise en veille sélective du port USB. |

---

## 🚀 Comment Lancer l'Application Web ?

1. Ouvrez le dossier `c:\Users\Jorda\Desktop\gres`.
2. Double-cliquez sur **`index.html`** (s'ouvre dans n'importe quel navigateur Web).
3. Cliquez sur le bouton bleu **"Activer le Moteur Audio Web"** pour démarrer le diagnostic automatique.

---

## 🔬 Outils Intégrés dans l'Application

- **Générateur de Fréquence Pur (Sine Wave)** : Générez des sons de 50 Hz à 10 000 Hz pour vérifier si les grésillements se produisent à une fréquence spécifique.
- **Balayage Fréquentiel (Frequency Sweep)** : Balaye tout le spectre (20 Hz - 20 kHz) pour tester la résonance du casque et des pilotes.
- **Simulateur de Charge / Stress Test Buffer** : Simule une forte activité processeur pour observer à quel moment le buffer craque.
- **Analyseur de Spectre & Oscilloscope Temps Réel** : Visualisez la forme d'onde et soyez averti immédiatement en cas de **Clipping / Saturation numérique** (indicateur rouge).
- **Test de Microphone** : Mesure le gain d'entrée de votre micro avec un vumètre de précision.
- **Exportateur de Rapport** : Génère un rapport texte complet copiable ou téléchargeable (`.txt`) pour partager le diagnostic.
