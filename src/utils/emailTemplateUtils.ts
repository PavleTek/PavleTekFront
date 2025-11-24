/**
 * Replaces date variables in email template strings with actual date values
 * @param template - The template string containing variables like ${date}, ${englishMonth}, ${spanishMonth}, ${year}
 * @param date - The date string (typically in ISO format YYYY-MM-DD)
 * @returns The template string with all date variables replaced
 */
export const replaceDateVariables = (template: string, date: string): string => {
  if (!template) {
    return "";
  }

  if (!date) {
    // If no date provided, return template as-is (variables will remain unreplaced)
    return template;
  }

  try {
    // Parse the date - handle ISO format (YYYY-MM-DD) and other formats
    let dateObj: Date;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // ISO format (YYYY-MM-DD)
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      // MM/DD/YYYY format
      const [month, day, year] = date.split('/').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      // Try to parse as-is
      dateObj = new Date(date);
    }

    // Validate date
    if (isNaN(dateObj.getTime())) {
      // Invalid date, return template as-is
      return template;
    }

    // Format date as MM/DD/YYYY
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;

    // Get English month name
    const englishMonth = dateObj.toLocaleString('en-US', { month: 'long' });

    // Get Spanish month name and capitalize first letter
    const spanishMonthLower = dateObj.toLocaleString('es-ES', { month: 'long' });
    const spanishMonth = spanishMonthLower.charAt(0).toUpperCase() + spanishMonthLower.slice(1);

    // Replace all variables in the template
    let result = template;
    result = result.replace(/\$\{date\}/g, formattedDate);
    result = result.replace(/\$\{englishMonth\}/g, englishMonth);
    result = result.replace(/\$\{spanishMonth\}/g, spanishMonth);
    result = result.replace(/\$\{year\}/g, String(year));

    return result;
  } catch (error) {
    // If any error occurs, return template as-is
    console.error("Error replacing date variables:", error);
    return template;
  }
};

