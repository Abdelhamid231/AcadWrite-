# Rapport de projet : AcadWrite+

## Contexte

AcadWrite+ est une plateforme pensee pour accompagner les etudiants, chercheurs et enseignants algeriens dans la redaction academique, la methodologie de recherche, la traduction et la relecture de documents. Le point de depart etait un schema decrivant les grandes fonctionnalites attendues (espace utilisateur, redaction, methodologie, traduction, correction, formations, espace administrateur). Le developpement s'est fait par etapes, en partant d'une version minimale puis en ajoutant progressivement les modules, la securite et enfin l'hebergement.

## Ce qui a ete construit

La plateforme couvre aujourd'hui : l'inscription et la connexion, le depot de documents pour une demande de correction, de traduction ou d'aide a la redaction, un suivi de commande avec devis et paiement (CCP, BaridiMob, Edahabia, virement bancaire), un assistant conversationnel base sur l'IA capable de reformuler un texte, le resumer, generer une bibliographie ou proposer des titres, un espace de formations ou l'administrateur peut publier des cours en PDF ou Word, et un espace d'administration pour gerer les utilisateurs, les demandes et les paiements.

Les comptes se repartissent en trois profils avec des acces differents :

- **Etudiant** (Licence, Master, Doctorat ou Libre) : acces complet, depot de demandes, suivi, paiement, assistant IA, formations.
- **Enseignant** : espace allege, centre sur les cours et l'assistant IA, sans les fonctionnalites de demande qui ne le concernent pas.
- **Administrateur** : gestion complete de la plateforme (utilisateurs, demandes, paiements, cours), sans les outils cote etudiant qui n'ont pas de sens pour lui.

Cette separation n'existait pas au debut : elle a ete ajoutee en cours de route pour que chaque type de compte ne voie que ce qui le concerne, plutot que d'avoir une seule interface generique pour tout le monde.

## Technologies utilisees

Le back-end repose sur Node.js et Express, avec PostgreSQL comme base de donnees. L'authentification et le stockage des fichiers (documents deposes, justificatifs de paiement, cours) passent par Supabase, ce qui evite de gerer soi-meme les mots de passe et simplifie le stockage prive des fichiers. Le front-end est volontairement simple, en HTML, CSS et JavaScript natifs sans framework, pour rester leger et facile a maintenir. L'assistant IA s'appuie sur l'API OpenRouter avec le modele gpt-oss-120b. Le site est heberge sur Vercel.

## Securite

Une revue de securite a ete faite sur l'ensemble du code. Les points corriges : verification systematique que chaque utilisateur n'accede qu'a ses propres donnees, requetes SQL parametrees pour eviter les injections, limitation du nombre de tentatives sur les endpoints sensibles (connexion, inscription, assistant IA) pour freiner les abus, en-tetes de securite standards, et une faille qui aurait permis de contourner l'authentification si une variable d'environnement critique venait a manquer a ete corrigee pour que le serveur refuse de demarrer plutot que de tourner avec une configuration dangereuse.

## Pour la suite

La structure actuelle laisse de la place pour grandir : ajouter de nouveaux types de services, plus de categories de cours, ou affiner encore la gestion des roles si les besoins de la plateforme evoluent.
