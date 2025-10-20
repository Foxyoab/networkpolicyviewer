# Visualiseur de Network Policies Kubernetes

Un outil web simple et interactif pour visualiser les politiques réseau (Network Policies) de Kubernetes.

## Fonctionnalités

- **Visualisation depuis YAML** : Collez un ou plusieurs manifestes YAML de Network Policies (séparés par `---`) et visualisez-les instantanément.
- **Explorateur de Cluster Live** : Connectez-vous à votre contexte Kubernetes local pour lister et visualiser toutes les politiques réseau présentes dans votre cluster, organisées par namespace.
- **Interface Claire** : Une disposition en trois colonnes (Ingress, Cible, Egress) pour une compréhension facile et rapide des flux de trafic autorisés.
- **Détection Intelligente** : Reconnaît les politiques ciblant des pods spécifiques ou un namespace entier.

## Prérequis

- [Node.js](https://nodejs.org/) (version 16 ou supérieure)
- [npm](https://www.npmjs.com/)
- Un accès à un cluster Kubernetes via un fichier `kubeconfig` valide (généralement situé dans `~/.kube/config`).

## Installation et Lancement

1.  **Clonez le dépôt :**
    ```sh
    git clone https://github.com/Foxyoab/networkpolicyviewer.git
    cd networkpolicyviewer
    ```

2.  **Installez les dépendances :**
    ```sh
    npm install
    ```

3.  **Lancez l'application (frontend + backend) :**
    ```sh
    npm run dev
    ```

4.  Ouvrez votre navigateur et allez sur `http://localhost:3000`.

## Utilisation

L'application dispose de deux modes accessibles depuis la barre de navigation :

### 1. YAML Visualizer

C'est la page par défaut. Vous pouvez coller le contenu d'un ou plusieurs fichiers de Network Policy dans l'éditeur de texte à gauche. Le graphe correspondant s'affichera à droite. S'il y a plusieurs politiques (séparées par `---`), un menu déroulant apparaîtra pour vous permettre de basculer entre elles.

### 2. Cluster Visualizer

Cette page se connecte à votre cluster Kubernetes via votre configuration locale. Elle liste tous les namespaces contenant des Network Policies. Sélectionnez un namespace dans le menu déroulant pour afficher une vue d'ensemble de toutes les politiques qui y sont appliquées.