import { API_BASE_URL } from '@/lib/api';

export interface FeedbackData {
    name?: string;
    email?: string;
    message: string;
    type: 'complaint' | 'suggestion' | 'bug' | 'other';
}

export const feedbackService = {
    submitFeedback: async (data: FeedbackData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: data.name,
                    userEmail: data.email,
                    message: data.message,
                    type: data.type
                }),
            });

            // Handle non-JSON responses
            const text = await response.text();
            if (!text) {
                if (response.ok) {
                    return { success: true };
                }
                throw new Error('Empty response from server');
            }

            try {
                const json = JSON.parse(text);
                if (!response.ok) {
                    throw new Error(json.error || 'Failed to submit feedback');
                }
                return json;
            } catch (parseError) {
                if (response.ok) {
                    return { success: true, raw: text };
                }
                throw new Error(text || 'Failed to parse server response');
            }
        } catch (error) {
            console.error('Feedback submission error:', error);
            throw error;
        }
    },

    getAllFeedback: async (token: string) => {
        const response = await fetch(`${API_BASE_URL}/feedback`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch feedback');
        }

        return response.json();
    },

    updateStatus: async (id: number | string, status: string, token: string) => {
        const response = await fetch(`${API_BASE_URL}/feedback/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw new Error('Failed to update status');
        }

        return response.json();
    }
};
