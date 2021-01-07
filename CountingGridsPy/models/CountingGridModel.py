# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import math
import os
import numpy as np
import scipy.io
import scipy.stats

np.random.seed(0)
# Two functions for use by users of the library:
# 1.
# fit(data,.) - Fits the counting grids model to the data set. if layers >1,
# then learned a hierarchical layered counting grid.

# 2.
# predict_probabilities(bagofwordcounts,k)) - computes the likelihood,
# the probability of the data given the parameters and choice of window


class CountingGridModel():
    def __init__(self, extent, window):
        """
        extent is a 1-D array of size D in the paper.
        D is often 2, since it makes the model easily visualizable.
        window is a one-dimensional of size D in the paper.
        """

        # E in the paper
        self.extent = extent
        # W in the paper
        self.window = window
        self.D = len(extent)
        # Each word is some value between 1 & the size of vocabulary
        self.vocabulary = np.array([])

        self.extent_volume = 1
        self.window_volume = 1
        for v in self.window:
            self.window_volume *= v
        for v in self.extent:
            self.extent_volume *= v

        self.capacity = self.extent_volume / self.window_volume

    # Assumes:  self.pi, self.q,self.extent are set properly
    def cg_layers(self, data, L, noise=1e-10):
        T, Z = data.shape
        pi_la = np.zeros([self.extent[0], self.extent[1], Z, L])
        h_la = np.zeros([self.extent[0], self.extent[1], Z, L])
        
        # Uses self variable from cg_layers namespace
        def compute_h(pi, W):
            PI = np.pad(pi, [(0, W[0]), (0, W[1]), (0, 0)],
                        'wrap').cumsum(axis=0).cumsum(axis=1)
            PI = np.pad(PI, [(1, 0), (1, 0), (0, 0)], 'constant')
            w0 = W[0]
            w1 = W[1]
            cumsum_output = self.compute_h_noLoopFull(PI, w0, w1)
            return np.moveaxis(np.moveaxis(cumsum_output[:-1, :-1, :], 2, 0)/np.sum(cumsum_output[:-1, :-1, :], axis=2), 0, -1)

        # Modifies: h_la
        def layer_compute_h(pi_la, h_la):
            h = compute_h(pi_la[:, :, :, l], self.window)
            h_la[:, :, :, l] = np.transpose(
                np.transpose(h) / np.transpose(np.sum(h, axis=2))
            )

        # Add noise to pi
        for l in range(L):
            pi_la[:, :, :, l] = (
                self.pi + np.random.uniform(size=self.pi.shape)*noise
            )
            # Normalize
            pi_la[:, :, :, l] = np.transpose(
                np.transpose(pi_la[:, :, :, l]) /
                np.transpose(np.sum(pi_la[:, :, :, l], axis=2))
            )
            layer_compute_h(pi_la, h_la)
        P = np.prod(self.extent)

        # lq/lql is the log of q
        # lq/lql is shaped as ([P,T])
        # self.q is stored as TxE1xE2, which is why we
        def normalize_q(lq):
            lqlmax = np.amax(lql, axis=0)
            precompute_lql_minus_max = lql - lqlmax
            # qla has the same formula, essentially, but not in the log form
            Lq = np.reshape(
                precompute_lql_minus_max -
                np.log(np.sum(np.exp(precompute_lql_minus_max), axis=0)),
                [self.extent[0], self.extent[1], T]
            )
            return np.moveaxis(np.exp(Lq), 2, 0)

        def update_summand(self, toroidal_F, M, N):
            A = toroidal_F.cumsum(axis=0).cumsum(axis=1)
            c = np.pad(
                A,
                pad_width=tuple([(1, 0) for x in list(self.extent)] + [(0, 0)]), mode='constant', constant_values=0
            )
            w0 = self.window[0]
            w1 = self.window[1]
            return (
                c[slice(w0, toroidal_F.shape[0]+1), slice(w1, toroidal_F.shape[1]+1), :] -
                c[slice(0, self.extent[0]), slice(w1, toroidal_F.shape[1] + 1), :] -
                c[slice(w0, toroidal_F.shape[0]+1), slice(0, self.extent[1]), :] +
                c[slice(0, self.extent[0]), slice(0, self.extent[1]), :]
            )[slice(0, toroidal_F.shape[0]), slice(0, toroidal_F.shape[1]), :]

        # Adding noise to q, which was not originally in the matlab code
        self.q = self.q + 0.25*noise
        lql = np.log(np.reshape(np.moveaxis(self.q, 0, -1), (P, T)))
        self.q = normalize_q(lql)
        qlsm = qlsm = np.fft.ifft2(np.fft.fft2(
            np.reshape(self.q, (T, P))
        )).real.astype(np.float64)
        lql = np.log(np.reshape(np.moveaxis(self.q, 0, -1), (P, T)))

        # Check the distribution properties of ql
        '''
        assert( np.all(np.isclose(np.sum(self.q,axis=0)[:,:],1 ) )==True)
        assert(np.any((self.q) <0 ) == False)
        '''

        alpha = 1e-10
        miter = 1

        SCALING_FACTOR = 2.5
        # ~1/2 the average number of number of word per document, make this number smaller as the counting grid gets bigger
        pseudocounts = np.mean(np.sum(data, axis=1)) / (P*SCALING_FACTOR)
        # This is the posterior for each layer Q( Layer | document ).
        qla = np.ones([L, T])
        lqla = np.log(qla)

        plal = np.ones([L, P]) / L  # P(layer | position in counting grid)
        dirichlet_prior = np.ones([L, Z])

        # Didn't implement the fft to smooth the posterior probabilities
        # of picking a location, differing from previous code by choice.
        every_iter = 1
        nmax = 2  # maximum number of iterations
        start_ql = 1

        minp = 1e-10
        TOROID_ARGUMENTS = [(self.window[0], 0), (self.window[1], 0), (0, 0)]
        eps = (np.finfo(h_la.dtype).eps)
        for iter in range(nmax):
            # assert( np.all(np.isclose(np.sum(np.reshape(np.transpose(self.q),(P,T)),axis=0),1 ) ))
            # assert(np.any((self.q) <0 ) == False)
            # assert(np.all(np.isclose(np.sum(qla,axis=0),1 )))
            # assert(np.any((qla) <0 ) == False)

            if iter >= start_ql:
                lql = np.zeros([P, T])
                for l in range(L):
                    tmp = np.reshape(np.log(eps + h_la[:, :, :, l]), [P, Z])
                    # qla is the Q(layer) in the mean field posterior factorization, its structure is L,T
                    lql = lql + np.dot(tmp, np.transpose(data))*qla[l, :]
                    self.q = np.reshape(
                        normalize_q(lql),
                        [T, self.extent[0], self.extent[1]]
                    )

                    # Didn't use the smoothened ql
                    qlsm = np.fft.ifft2(np.fft.fft2(
                        np.reshape(self.q, (T, P))
                    )).real.astype(np.float64)

            # update Q(layer)
            tmpq = np.reshape(np.moveaxis(np.copy(self.q), 0, -1), [P, T])
            for l in range(L):
                tmp = np.reshape(np.log(alpha + h_la[:, :, :, l]), [P, Z])
                lqla[l, :] = np.sum(
                    tmpq*(np.dot(tmp, np.transpose(data)) +
                          np.reshape(np.transpose(np.log(plal[l, :])), [P, 1])),
                    axis=0
                )

            lqlamax = np.amax(lqla, axis=0)
            qla = np.exp(
                (lqla - lqlamax) - np.log(np.sum(np.exp((lqla - lqlamax)), axis=0))
            )

            # M-STEP. Basically the normal CG M-Step, repeated #Layers times.
            # Reimplemented it to include the dirichlet prior in the mix
            for l in range(L):
                # Dirichlet prior. Does very little in practice, may be useful only in the early stages of learning... leave it.
                tmpdirip = dirichlet_prior[l, :] - 1
                tmpdirip[np.isnan(tmpdirip)] = 0

                # Recall that self.q is T x E1 x E2 tensor
                # Original Matlab code here for reference:
                #
                # nrm = bsxfun(@plus, reshape(tmpdirip,[1 1 Z]),
                # reshape(  reshape( padarray( ql, W, 'circular','pre'),
                # [prod(cg_size+W),T])*bsxfun( @times, WD, qla(l,:))', [ cg_size+W,Z ]));
                first = np.reshape(np.pad(np.moveaxis(
                    self.q, 0, -1), TOROID_ARGUMENTS, 'wrap'), [np.prod(self.extent+self.window), T])
                # using transpose function make sense here because we're just swapping 2 Dimensions
                D = np.dot(first, np.transpose(np.transpose(data) * qla[l, :]))
                nrm = np.reshape(tmpdirip, [1, 1, Z]) + np.reshape(
                    D, [self.extent[0]+self.window[0], self.extent[1]+self.window[1], Z])

                QH = nrm / \
                    np.pad(h_la[:, :, :, l] + np.prod(self.window) * alpha, TOROID_ARGUMENTS, 'wrap')
                QH = QH[slice(1, self.extent[0]+self.window[0]),
                        slice(1, self.extent[1]+self.window[1]), :]
                QH = update_summand(self, QH, T, Z)
                QH[QH < 0] = 0

                un_pi = pseudocounts + QH*(pi_la[:, :, :, l]+alpha)
                mask = np.sum(un_pi, 2) != 0
                nmask = np.sum(un_pi, 2) == 0
                M1 = np.transpose(np.transpose(
                    un_pi)*np.transpose(mask.astype(np.float64)) / np.transpose(np.sum(un_pi, 2)))
                M2 = np.ones([Z, self.extent[0], self.extent[1]]) * \
                    (nmask).astype(np.float64)
                pi_la[:, :, :, l] = M1 + np.moveaxis((1.0/Z) * M2, 0, 2)
                layer_compute_h(pi_la, h_la)

            qlsm = np.fft.ifft2(np.fft.fft2(np.reshape(
                self.q, (T, P)))).real.astype(np.float64)
            A = np.sum(qlsm, axis=0)
            if np.any(np.isclose(A, 0)):
                A += eps
            plal = np.transpose(np.reshape(np.sum(np.reshape(np.moveaxis(
                qlsm, 0, -1), [self.extent[0], self.extent[1], T, 1]) * np.reshape(np.transpose(qla), [1, 1, T, L]), axis=2), [P, L]))/A
            plal[plal < 1e-100] = 1e-100
            plal = plal / np.sum(plal, axis=0)  # sum over the layers

        INVERSE_DOCUMENT_FREQUENCY = np.log(
            data.shape[0] + eps) - np.log(np.sum((data > 0).astype(np.float64), axis=0) + eps)

        pi_la_idf = np.zeros(pi_la.shape)
        for l in range(L):
            pi_la_idf[:, :, :, l] = pi_la[:, :, :, l] * \
                INVERSE_DOCUMENT_FREQUENCY

        id_layers = np.argmax(qla, axis=0) + 1
        wg_ep = eps
        mask = np.pad(np.ones(self.window), [
                      (0, x) for x in self.extent-self.window], 'constant', constant_values=0)
        wg = np.zeros([self.extent[0], self.extent[1], L])
        for l in range(L):
            idl = np.where(id_layers-1 == l)[0]  # id_layer in matlab format
            for t in range(len(idl)):
                wg[:, :, l] = wg[:, :, l] + np.fft.ifft2(np.fft.fft2(mask)*np.fft.fft2(
                    self.q[idl[t], :, :])).real.astype(np.float64)  # m x E structure

        # This makes wg not a distribution.
        wg = np.transpose(np.transpose(
            wg) / (np.sum(np.transpose(wg), axis=0) + wg_ep))
        # sum over the layers
        pi2_idf = np.sum(
            pi_la_idf*np.reshape(wg, [self.extent[0], self.extent[1], 1, L]), axis=3)

        # Renormalize Pi after using inverse document frequency.
        pi2_idf = np.transpose(np.transpose(pi2_idf) /
                               np.transpose(np.sum(pi2_idf, axis=2)))

        return {
            "pi2_idf": pi2_idf, "pi_la_idf": pi_la_idf, "id_layer": [id_layers],
            "ql2": self.q, "counts_to_show": np.transpose(data), "indices_to_show": [np.array(list(range(T))) + 1],
            "pi": self.pi, "pi_la": pi_la
        }

    def fit(
        self, data, max_iter=100, returnSumSquareDifferencesOfPi=False,
        noise=.000001, learn_pi=True, pi=None, layers=1, output_directory="./",
        heartBeaters=None, writeOutput=True
    ):
        """
        Implements variational expectation maximization for the Counting Grid model
        Assumes: data is an m x n matrix
        TO DO: return early if fitness converges. don't just run it for max iter.
        """

        if not os.path.exists(str(output_directory)):
            raise Exception(
                "output_directory does not exist for counting grids trainer."
            )

        def SSD(pi, piHat):
            A = np.abs(pi - piHat)
            return np.sum(A * A)

        alpha = 1e-10
        SSDPi = []
        data = data.astype(np.float64)
        if pi is None:
            self.initializePi(data)
        else:
            self.pi = pi
            
        self.h = self.compute_h(self.pi, self.window)
        self.check_model()
        extentProduct = np.prod(self.extent)
        T, _ = data.shape

        pseudocounts = np.mean(np.sum(data, axis=1) / extentProduct) / 2.5

        # q is an m x dim(extent) structure
        qshape = [len(data)]
        for v in self.extent:
            qshape.append(v)
        self.q = np.zeros(tuple(qshape))
        i = 0
        while i < max_iter:
            # E-Step
            self.q = self.q_update(data)

            # M-Step
            if learn_pi:
                if returnSumSquareDifferencesOfPi:
                    pi = self.pi

                self.pi = self.pi_update(data, pseudocounts, alpha)
                if returnSumSquareDifferencesOfPi:
                    piHat = self.pi
                    SSDPi.append(SSD(pi, piHat))
                self.h = self.compute_h(self.pi, self.window)
            i = i + 1
            [(h.makeProgress(int(100*i/max_iter)) if h is not None else False)
             for h in heartBeaters] if heartBeaters is not None else False
        
        if layers > 1:
            self.layercgdata = self.cg_layers(data, L=layers, noise=noise)

        if writeOutput:
            if layers > 1:
                scipy.io.savemat(str(output_directory) + "/CountingGridDataMatrices.mat", self.layercgdata)
            else:
                scipy.io.savemat(str(output_directory) + "/CGData.mat", {"pi": self.pi, "q": self.q})
        return self.pi

    # assumptions that we need for the model to be valid
    def check_model(self):
        assert(len(self.extent) == len(self.window))
        for v in self.extent:
            assert(int(v) == v)
            assert(v > 0)
        for v in self.window:
            assert(int(v) == v)
            assert(v > 0)

        # dimensions of pi is one more than the window
        assert(self.pi.ndim - 1 == len(self.window))

    # w0 and w1 are window size
    def compute_h_noLoopFull(self, PI, w0, w1):
        return PI[w0:, w1:, :] - PI[:-w0, w1:, :] - PI[w0:, :-w1, :] + PI[:-w0, :-w1, :]

    # no side effects
    def compute_h(self, pi, W):
        PI = np.pad(pi, [(0, W[0]), (0, W[1]), (0, 0)],
                    'wrap').cumsum(axis=0).cumsum(axis=1)
        PI = np.pad(PI, [(1, 0), (1, 0), (0, 0)], 'constant')
        w0 = W[0]
        w1 = W[1]
        cumsum_output = self.compute_h_noLoopFull(PI, w0, w1)
        return np.moveaxis(np.moveaxis(cumsum_output[:-1, :-1, :], 2, 0)/np.sum(cumsum_output[:-1, :-1, :], axis=2), 0, -1)

    # How to initialize pi
    # Note that we don't want pi to be 0, since our update equations depend on a multiplication by pi
    def initializePi(self, data, technique="uniform"):
        if technique == "uniform":
            size = [x for x in self.extent]
            size.append(data.shape[1])
            self.pi = np.random.random(size=tuple(size)).astype(np.float64)
        else:
            raise ValueError("No initialize strategy given")

    def pi_update(self, data, pseudocounts, alpha):
        '''
        Modifies: pi
        Assumes: self.q has been initialized (in the fit function) and that h has been initialized
        Assumes: a two dimensional extent
        Recall: q is M x E tensor
        '''
        T, Z = data.shape
        W = self.window
        # QdotConH is called nrm in matlab engine, but padding is done beforehand in matlab
        QdotConH = np.dot(np.moveaxis(self.q, 0, -1,), data)
        QH = np.pad(QdotConH / (self.h + np.prod(self.window)*alpha),
                    [(W[0], 0), (W[1], 0), (0, 0)], 'wrap').cumsum(axis=0).cumsum(axis=1)
        w0 = W[0]
        w1 = W[1]
        QH = self.compute_h_noLoopFull(QH, w0, w1)
        QH[QH < 0] = 0

        un_pi = pseudocounts + QH*(self.pi+alpha)
        mask = (np.sum(un_pi, axis=2) != 0).astype(np.float64)
        not_mask = (np.sum(un_pi, axis=2) == 0).astype(np.float64)
        denom = np.sum(un_pi, axis=2)
        self.pi = np.transpose(np.transpose(mask)*(np.transpose(un_pi) / np.transpose(denom))) + \
            (1.0/Z) * np.transpose(np.transpose(
                np.ones([self.extent[0], self.extent[1], Z]))*np.transpose(not_mask))
        return self.pi

    def get_indices_for_window_indexed_by_k(self, k, z):
        indices = [[]]*len(self.extent)
        for j, v in enumerate(indices):
            indices[j] = slice(k[j], k[j] + self.window[j])
        indices.append(z)  # the z index in the paper
        return tuple(indices)

    def get_h(self):
        return self.h

    def q_update(self, data):
        L = np.prod(self.extent)
        lql = np.dot(np.log(self.h).reshape(
            (L, data.shape[1])), np.transpose(data))
        lqlmax = np.amax(lql, axis=0)
        min_prob = 1.0/(10*L)
        Lq = ((lql-lqlmax)-np.log(np.sum(np.exp(lql-lqlmax), axis=0))
              ).reshape(tuple(list(self.extent) + [data.shape[0]]))
        q = np.exp(Lq)
        q[q < min_prob] = min_prob
        q = q / np.sum(np.sum(q, axis=0), axis=0)
        return np.moveaxis(q, 2, 0)

    # Assumes: bagofwordcounts are integers
    def predict_probabilities(self, bagofwordcounts, k):
        assert(len(k) == len(self.window))

        log_p = 0  # log of the products is the sum of the logs
        for (i, count) in enumerate(bagofwordcounts):
            if count > 0:
                indices = self.get_indices_for_window_indexed_by_k(k, i)
                log_p += np.log(np.sum(self.pi[indices].reshape(
                    self.pi[indices].size)))*float(count)

        # 1/normalizationfactor * probability
        # e ^ (log(prob) - log(normalization factor))
        return math.pow(
            math.e,
            log_p - np.sum(bagofwordcounts)*np.sum(np.log(self.window))
        )


if __name__ == "__main__":
    data = np.array([
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [1, 2, 1, 0, 1, 0, 0, 0, 0, 0],
        [0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 1, 1, 1]
    ])
    extent = np.array([3, 3])
    window = np.array([2, 2])
    model = CountingGridModel(extent, window)
    model.fit(data, max_iter=1000,
              returnSumSquareDifferencesOfPi=False, layers=2)
