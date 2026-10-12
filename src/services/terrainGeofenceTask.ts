/**
 * terrainGeofenceTask — enregistre la tâche de geofencing terrain au chargement du module.
 *
 * Importé par `index.ts` (point d'entrée) AVANT expo-router : si iOS relance l'app tuée pour
 * un événement de région, la tâche doit être définie avant tout rendu, sinon expo-task-manager
 * désinscrit la tâche.
 */
import { defineTerrainGeofenceTask } from '@/services/terrainGeofence';

defineTerrainGeofenceTask();
