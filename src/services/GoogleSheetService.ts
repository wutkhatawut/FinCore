import dotenv from "dotenv";

dotenv.config();

export interface Transaction {
  id?: number;
  date: string;
  type: "รายรับ" | "รายจ่าย";
  category: string;
  amount: number;
  notes: string;
}

export class GoogleSheetService {
  private static getWebappUrl(): string {
    const url = process.env.GAS_WEBAPP_URL;
    if (!url || url.includes("placeholder") || url.includes("XXXXX")) {
      throw new Error("GAS_WEBAPP_URL is not configured or is set to placeholder.");
    }
    return url;
  }

  /**
   * Fetch all transactions from Google Sheets via Apps Script Web App
   */
  public static async getAllTransactions(): Promise<Transaction[]> {
    try {
      const url = this.getWebappUrl();
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch data from GAS web app");
      }

      return result.data || [];
    } catch (error: any) {
      console.error("GoogleSheetService.getAllTransactions error:", error);
      throw error;
    }
  }

  /**
   * Add a new transaction to Google Sheets via Apps Script Web App
   */
  public static async addTransaction(transaction: Omit<Transaction, "id">): Promise<boolean> {
    try {
      const url = this.getWebappUrl();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to append row to Google Sheets via GAS web app");
      }

      return true;
    } catch (error: any) {
      console.error("GoogleSheetService.addTransaction error:", error);
      throw error;
    }
  }

  /**
   * Delete transactions from Google Sheets by their row numbers (IDs)
   */
  public static async deleteTransactions(ids: number[]): Promise<boolean> {
    try {
      const url = this.getWebappUrl();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          ids: ids,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete rows from Google Sheets via GAS web app");
      }

      return true;
    } catch (error: any) {
      console.error("GoogleSheetService.deleteTransactions error:", error);
      throw error;
    }
  }
}
