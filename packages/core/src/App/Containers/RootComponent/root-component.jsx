import React, { useEffect } from 'react';
import Cookies from 'js-cookie';

import { Loading } from '@deriv/components';
import { useIsHubRedirectionEnabled, useOauth2 } from '@deriv/hooks';
import { deriv_urls, getDomainUrl, moduleLoader } from '@deriv/shared';
import { observer, useStore } from '@deriv/stores';

const AppStore = React.lazy(() =>
    moduleLoader(() => {
        // eslint-disable-next-line import/no-unresolved
        return import(/* webpackChunkName: "appstore" */ '@deriv/appstore');
    })
);

const Wallets = React.lazy(() =>
    moduleLoader(() => {
        // eslint-disable-next-line import/no-unresolved
        return import(/* webpackChunkName: "wallets" */ '@deriv/wallets');
    })
);

const RootComponent = observer(props => {
    const { client, ui } = useStore();
    const {
        is_wallets_onboarding_tour_guide_visible,
        setIsWalletsOnboardingTourGuideVisible,
        notification_messages_ui,
    } = ui;
    const {
        has_wallet,
        logout,
        prevent_redirect_to_hub,
        is_client_store_initialized,
        prevent_single_login,
        is_logging_out,
        is_logged_in,
        setPreventSingleLogin,
    } = client;

    const { oAuthLogout } = useOauth2({ handleLogout: logout });

    const onWalletsOnboardingTourGuideCloseHandler = () => {
        setIsWalletsOnboardingTourGuideVisible(false);
    };
    const { isHubRedirectionEnabled, isHubRedirectionLoaded } = useIsHubRedirectionEnabled();

    const PRODUCTION_REDIRECT_URL = `https://hub.${getDomainUrl()}/tradershub`;
    const STAGING_REDIRECT_URL = `https://staging-hub.${getDomainUrl()}/tradershub`;

    useEffect(() => {
        setPreventSingleLogin(true);
    }, []);

    useEffect(() => {
        if (
            isHubRedirectionEnabled &&
            has_wallet &&
            !is_logging_out &&
            is_logged_in &&
            !prevent_redirect_to_hub &&
            is_client_store_initialized
        ) {
            const redirectUrl = process.env.NODE_ENV === 'production' ? PRODUCTION_REDIRECT_URL : STAGING_REDIRECT_URL;

            const redirect_to_lowcode = localStorage.getItem('redirect_to_th_os');
            localStorage.removeItem('redirect_to_th_os');

            const domain = /deriv\.(com|me|be)/.test(window.location.hostname)
                ? deriv_urls.DERIV_HOST_NAME
                : window.location.hostname;
            Cookies.set('wallet_account', true, { domain });

            const url_query_string = window.location.search;
            const url_params = new URLSearchParams(url_query_string);
            const account_currency = window.sessionStorage.getItem('account') || url_params.get('account');

            switch (redirect_to_lowcode) {
                case 'wallet':
                    localStorage.setItem('wallet_redirect_done', true);
                    window.location.href = `${redirectUrl}/redirect?action=redirect_to&redirect_to=wallet_home${account_currency ? `&account=${account_currency}` : ''}`;
                    break;
                default:
                    window.location.href = `${redirectUrl}/redirect?action=redirect_to&redirect_to=home${account_currency ? `&account=${account_currency}` : ''}`;
                    break;
            }
        }

        const shouldStayInDerivApp = !isHubRedirectionEnabled || !has_wallet || prevent_redirect_to_hub;
        if (prevent_single_login && isHubRedirectionLoaded && is_client_store_initialized && shouldStayInDerivApp) {
            setPreventSingleLogin(false);
        }
    }, [
        isHubRedirectionLoaded,
        isHubRedirectionEnabled,
        has_wallet,
        is_logging_out,
        is_logged_in,
        prevent_redirect_to_hub,
        prevent_single_login,
        is_client_store_initialized,
    ]);

    if (
        !is_client_store_initialized ||
        (has_wallet && !isHubRedirectionLoaded) ||
        (has_wallet && isHubRedirectionLoaded && isHubRedirectionEnabled)
    ) {
        return <Loading is_fullscreen />;
    }

    return has_wallet ? (
        <Wallets
            isWalletsOnboardingTourGuideVisible={is_wallets_onboarding_tour_guide_visible}
            logout={async () => {
                await oAuthLogout();
            }}
            notificationMessagesUi={notification_messages_ui}
            onWalletsOnboardingTourGuideCloseHandler={onWalletsOnboardingTourGuideCloseHandler}
            isHubRedirectionEnabled={isHubRedirectionEnabled}
        />
    ) : (
        <AppStore {...props} />
    );
});

export default RootComponent;
