/**
 * Types for RFID card management
 */

/**
 * RFID Card information
 */
export interface RFIDCard {
  index: number;
  uid: string;
  name: string;
  enabled: boolean;
  lastUsed?: number;
}

/**
 * Response for RFID cards list
 */
export interface RFIDCardsListResponse {
  cards: RFIDCard[];
  count: number;
  maxCards: number;
  learningMode: boolean;
}

/**
 * Request for starting RFID learning mode
 */
export interface RFIDLearnRequest {
  name?: string;
}

/**
 * Response for RFID learning status
 */
export interface RFIDLearnStatusResponse {
  learningMode: boolean;
  complete: boolean;
  success: boolean;
  result?: string;
  cardCount?: number;
}

/**
 * Request for updating RFID card
 */
export interface RFIDCardUpdateRequest {
  index: number;
  name?: string;
  enabled?: boolean;
}

/**
 * RFID access log entry
 */
export interface RFIDAccessLog {
  id: number;
  cardUid: string;
  cardName?: string;
  authorized: boolean;
  status: 'KNOWN' | 'UNKNOWN' | 'DISABLED';
  mcuSerialNumber?: string;
  homeId?: number;
  homeName?: string;
  deviceTimestamp?: number;
  createdAt: string;
}

/**
 * Response for RFID access logs (paginated)
 */
export interface RFIDAccessLogsResponse {
  content: RFIDAccessLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * RFID access statistics
 */
export interface RFIDAccessStats {
  totalAccess: number;
  authorizedCount: number;
  unauthorizedCount: number;
  knownCardsCount?: number;
  unknownCardsCount?: number;
  disabledCardsCount?: number;
}
