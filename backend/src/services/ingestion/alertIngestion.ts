import { grandLyonApi } from '../api/grandLyonApi';
import { alertRepository } from '../../database/repositories';

/**
 * Service d'ingestion des alertes trafic
 * Format: REST JSON de l'API GrandLyon
 */
export const ingestAlerts = async (): Promise<void> => {
  try {
    const alerts = await grandLyonApi.getAlerts();

    for (const alert of alerts) {
      const {
        n, // ID de l'alerte
        type,
        cause,
        debut, // Date de début (pas date_debut)
        fin, // Date de fin (pas date_fin)
        mode,
        ligne_com, // Nom commercial (pas ligne_nom_commercial)
        ligne_cli, // Nom client (pas ligne_nom_client)
        titre,
        message,
        last_update_fme, // Dernière mise à jour (pas date_modification)
        niveauseverite, // Niveau de sévérité (pas niveau_severite)
        typeseverite, // Type de sévérité (pas type_severite)
        typeobjet, // Type d'objet (pas type_objet)
        listeobjet, // Liste d'objets (pas liste_objet)
      } = alert;

      await alertRepository.upsert({
        alert_id: n,
        type,
        cause,
        start_time: debut,
        end_time: fin,
        mode,
        line_commercial_name: ligne_com,
        line_customer_name: ligne_cli,
        title: titre,
        message,
        last_update: last_update_fme,
        severity_type: typeseverite,
        severity_level: niveauseverite,
        object_type: typeobjet,
        object_list: listeobjet,
      });
    }

    console.log(`✓ Successfully ingested ${alerts.length} alerts`);
  } catch (error) {
    console.error('✗ Error ingesting alerts:', error);
    throw error;
  }
};
